const express = require("express");
const router = express.Router();
const { runQuery } = require("../services/awsService");

router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT r.sourceIPAddress, COUNT(*) as count
      FROM cloudtrail_logs
      CROSS JOIN UNNEST(records) AS t(r)
      GROUP BY r.sourceIPAddress
      ORDER BY count DESC
      LIMIT 10
    `;
    const data = await runQuery(sql);
    res.json({ success: true, data });
  } catch (err) {
    console.error("[/api/top-ips]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
