# 🛡️ Cloud-Native SOC (Security Operations Center) Platform

## 📌 Overview
This project is a fully automated Security Operations Center (SOC) built using AWS services. It collects real AWS activity logs, analyzes them using SQL, detects suspicious behavior, and sends real-time alerts.

---

## 🏗️ Architecture

AWS Activity  
→ CloudTrail  
→ S3 Data Lake  
→ Athena (SQL Queries)  
→ AWS Lambda (Threat Detection)  
→ SNS (Email Alerts)  
→ EventBridge (Automated Triggers)

---

## ⚙️ Tech Stack

- AWS CloudTrail  
- Amazon S3  
- AWS Athena  
- AWS Lambda (Node.js 20.x)  
- AWS SNS  
- AWS EventBridge  
- IAM Roles & Policies  
- SQL (Athena Queries)

---

## 🚀 Features

- Real-time AWS activity monitoring  
- Centralized log storage using S3  
- SQL-based threat detection  
- Automated alert generation  
- Serverless architecture  
- Fully event-driven system  

---

## 📊 Threat Detection Logic

Detects suspicious IP activity using Athena SQL:

```sql
SELECT r.sourceIPAddress, COUNT(*) as attempts
FROM cloudtrail_logs
CROSS JOIN UNNEST(Records) AS t(r)
GROUP BY r.sourceIPAddress
HAVING COUNT(*) > 1

<img width="1366" height="690" alt="image" src="https://github.com/user-attachments/assets/03f7f48a-5cd3-43fb-91a9-befc13c2edc1" />

