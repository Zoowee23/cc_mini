const express = require("express");
const cors = require("cors");
const path = require("path");

const logsRouter = require("./routes/logs");
const ipsRouter = require("./routes/ips");
const threatsRouter = require("./routes/threats");
const statsRouter = require("./routes/stats");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// API routes
app.use("/api/logs", logsRouter);
app.use("/api/top-ips", ipsRouter);
app.use("/api/threats", threatsRouter);
app.use("/api/stats", statsRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Fallback to frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🛡️  SOC Dashboard running at http://localhost:${PORT}`);
  console.log(`   AWS Region: ${process.env.AWS_REGION || "us-east-1"}`);
  console.log(`   Athena DB:  soc_logs\n`);
});
