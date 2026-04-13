const express = require("express");
const router = express.Router();
const { runQuery } = require("../services/awsService");

router.get("/", async (req, res) => {
  try {
    const [totalRes, uniqueIPRes, topEventRes] = await Promise.all([
      runQuery(`
        SELECT COUNT(*) as total
        FROM cloudtrail_logs
        CROSS JOIN UNNEST(records) AS t(r)
      `),
      runQuery(`
        SELECT COUNT(DISTINCT r.sourceIPAddress) as unique_ips
        FROM cloudtrail_logs
        CROSS JOIN UNNEST(records) AS t(r)
      `),
      runQuery(`
        SELECT r.eventName as eventname, COUNT(*) as cnt
        FROM cloudtrail_logs
        CROSS JOIN UNNEST(records) AS t(r)
        GROUP BY r.eventName
        ORDER BY cnt DESC
        LIMIT 1
      `),
    ]);

    res.json({
      success: true,
      data: {
        totalEvents: parseInt(totalRes[0]?.total ?? 0, 10),
        uniqueIPs: parseInt(uniqueIPRes[0]?.unique_ips ?? 0, 10),
        topEvent: topEventRes[0]?.eventname ?? "N/A",
      },
    });
  } catch (err) {
    console.error("[/api/stats]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
