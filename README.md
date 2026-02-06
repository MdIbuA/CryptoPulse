# ML-Driven Cryptocurrency Price Forecasting Platform

A comprehensive web platform for cryptocurrency price forecasting using LSTM and Gradient Boosting models, featuring real-time market data, technical analysis, and transparent model metrics.

## 📁 Repository Structure

```
├── WebApplication/          # Main web application (FastAPI + React)
│   ├── client/              # React frontend
│   ├── server/              # FastAPI backend
│   ├── Models_*/            # Trained ML models
│   ├── Scalers_*/           # Feature scalers
│   └── README.md            # Detailed documentation
│
├── Milestone1/              # Historical datasets & Jupyter notebooks
│   ├── Hourly_Dataset/      # Hourly OHLCV data
│   └── Daily_Dataset/       # Daily OHLCV data
│
└── ML-Driven-Web-Platform-for-Cryptocurrency-Price-Forecasting_*/
    └── ModelData/           # Additional model training data
```

## 🚀 Quick Start

See [`WebApplication/README.md`](./WebApplication/README.md) for detailed setup instructions.

### TL;DR

```bash
# Backend
cd WebApplication/server
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd WebApplication/client
npm install
npm run dev
```

## ✨ Key Features

- 📈 **Multi-horizon Forecasting**: 24h (LSTM) | 7d/15d/30d (Gradient Boosting)
- 📊 **Technical Indicators**: SMA, EMA, Bollinger Bands, RSI
- 🔐 **Secure Authentication**: JWT-based user sessions
- 📱 **Modern UI**: Responsive design with glassmorphism
- 🌍 **Multi-currency**: USD, EUR, GBP, INR, and more
- 📉 **Model Transparency**: Full training metrics & feature importance

## 🪙 Supported Cryptocurrencies

BTC, ETH, BNB, SOL, XRP, ADA, DOGE, DOT, MATIC, LTC

## 👥 Team

Infosys Springboard - Batch 5, November 2025
