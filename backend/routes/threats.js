const express = require("express");
const router = express.Router();
const { runQuery } = require("../services/awsService");

router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT r.sourceIPAddress, COUNT(*) as attempts
      FROM cloudtrail_logs
      CROSS JOIN UNNEST(records) AS t(r)
      GROUP BY r.sourceIPAddress
      HAVING COUNT(*) > 5
    `;
    const data = await runQuery(sql);

    // Attach severity classification
    const classified = data.map((row) => {
      const attempts = parseInt(row.attempts, 10);
      let severity;
      if (attempts > 10) severity = "HIGH";
      else if (attempts >= 5) severity = "MEDIUM";
      else severity = "LOW";
      return { ...row, severity };
    });

    res.json({ success: true, data: classified });
  } catch (err) {
    console.error("[/api/threats]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
