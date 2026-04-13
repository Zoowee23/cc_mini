const express = require("express");
const router = express.Router();
const { runQuery } = require("../services/awsService");

router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT r.eventName, r.sourceIPAddress, r.eventTime
      FROM cloudtrail_logs
      CROSS JOIN UNNEST(records) AS t(r)
      ORDER BY r.eventTime DESC
      LIMIT 50
    `;
    const data = await runQuery(sql);
    res.json({ success: true, data });
  } catch (err) {
    console.error("[/api/logs]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
