const {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} = require("@aws-sdk/client-athena");
const { fromIni } = require("@aws-sdk/credential-providers");

const REGION = process.env.AWS_REGION || "ap-south-1";

const client = new AthenaClient({
  region: REGION,
  credentials: fromIni({ profile: process.env.AWS_PROFILE || "default" }),
});

const ATHENA_DB = "soc_logs";
const ATHENA_OUTPUT = "s3://soc-logs-jui-123/athena-results/";
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 40;

async function runQuery(sql) {
  const start = await client.send(
    new StartQueryExecutionCommand({
      QueryString: sql,
      QueryExecutionContext: { Database: ATHENA_DB },
      ResultConfiguration: { OutputLocation: ATHENA_OUTPUT },
    })
  );

  const execId = start.QueryExecutionId;

  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const status = await client.send(
      new GetQueryExecutionCommand({ QueryExecutionId: execId })
    );
    const state = status.QueryExecution.Status.State;

    if (state === "SUCCEEDED") {
      return await fetchAllResults(execId);
    }
    if (state === "FAILED" || state === "CANCELLED") {
      const reason = status.QueryExecution.Status.StateChangeReason;
      throw new Error(`Athena query ${state}: ${reason}`);
    }
  }

  throw new Error("Athena query timed out");
}

async function fetchAllResults(execId) {
  const rows = [];
  let nextToken;
  let isFirstPage = true;

  do {
    const res = await client.send(
      new GetQueryResultsCommand({
        QueryExecutionId: execId,
        NextToken: nextToken,
      })
    );

    const columns = res.ResultSet.ResultSetMetadata.ColumnInfo.map((c) => c.Name);
    const resultRows = res.ResultSet.Rows;
    const start = isFirstPage ? 1 : 0; // skip header on first page only

    for (let i = start; i < resultRows.length; i++) {
      const row = {};
      resultRows[i].Data.forEach((cell, idx) => {
        row[columns[idx]] = cell.VarCharValue ?? null;
      });
      rows.push(row);
    }

    isFirstPage = false;
    nextToken = res.NextToken;
  } while (nextToken);

  return rows;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { runQuery };
