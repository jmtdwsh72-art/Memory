/**
 * Stock Trading Domain Knowledge Module
 * 
 * Beginner-focused stock market and trading education covering
 * fundamentals, risk management, and practical investment strategies.
 */

import { KnowledgeModule } from '../utils/knowledge-loader';

export const stockTradingKnowledge: KnowledgeModule = {
  domain: "Stock Trading & Investment",
  
  summary: "Stock trading involves buying and selling shares of publicly traded companies to generate profits. The stock market operates as a marketplace where investors can purchase ownership stakes in companies. Success requires understanding market fundamentals, risk management, and developing a disciplined investment strategy based on your financial goals and risk tolerance.",
  
  keyConcepts: [
    "Stocks and Shares (equity ownership, market capitalization, voting rights)",
    "Stock Exchanges (NYSE, NASDAQ, market hours, pre/after-market trading)",
    "Order Types (market orders, limit orders, stop-loss, stop-limit)",
    "Market Analysis (fundamental analysis, technical analysis, chart patterns)",
    "Key Metrics (P/E ratio, EPS, dividend yield, market cap, volume)",
    "Portfolio Diversification (asset allocation, sector distribution, risk spreading)",
    "Bull vs Bear Markets (market cycles, trends, investor sentiment)",
    "Trading Strategies (day trading, swing trading, buy-and-hold, value investing)",
    "Risk Management (position sizing, stop-losses, risk-reward ratios)",
    "Broker Accounts (cash accounts, margin accounts, fees, platforms)"
  ],
  
  commonMistakes: [
    "Emotional trading - letting fear and greed drive investment decisions",
    "Lack of diversification - putting all money into one stock or sector",
    "Trying to time the market - attempting to predict short-term price movements",
    "Not having a trading plan - trading without clear entry/exit strategies",
    "Ignoring risk management - not setting stop-losses or position limits",
    "Following hot tips without research - relying on rumors or social media",
    "Overtrading - making too many trades and accumulating high fees",
    "Not understanding the company before investing - buying based on hype alone",
    "Using money you can't afford to lose - investing emergency funds or borrowed money",
    "Panic selling during market downturns - selling at losses due to fear"
  ],
  
  useCases: [
    "Long-term Wealth Building - Buy and hold quality stocks for retirement",
    "Income Generation - Dividend-paying stocks for regular cash flow",
    "Capital Appreciation - Growth stocks for potential price increases",
    "Portfolio Hedging - Using options or inverse ETFs to protect against losses",
    "Day Trading - Short-term trading for quick profits (high risk)",
    "Swing Trading - Medium-term trades lasting days to weeks",
    "Value Investing - Finding undervalued companies with strong fundamentals",
    "Growth Investing - Investing in companies with high growth potential",
    "Index Fund Investing - Passive investing in market index funds",
    "Sector Rotation - Moving investments between different industry sectors"
  ],
  
  recommendedResources: [
    {
      name: "SEC Investor.gov - Beginner Resources",
      url: "https://www.investor.gov/introduction-investing"
    },
    {
      name: "Investopedia - Stock Market Basics",
      url: "https://www.investopedia.com/stock-market-4689832"
    },
    {
      name: "Bogleheads Investment Philosophy",
      url: "https://www.bogleheads.org/"
    },
    {
      name: "Morningstar Investment Research",
      url: "https://www.morningstar.com/"
    },
    {
      name: "Yahoo Finance - Market Data",
      url: "https://finance.yahoo.com/"
    },
    {
      name: "The Intelligent Investor by Benjamin Graham",
      url: "https://www.amazon.com/Intelligent-Investor-Definitive-Investing-Essentials/dp/0060555661"
    },
    {
      name: "SEC EDGAR Database - Company Filings",
      url: "https://www.sec.gov/edgar/"
    },
    {
      name: "Khan Academy - Finance and Capital Markets",
      url: "https://www.khanacademy.org/economics-finance-domain/core-finance"
    },
    {
      name: "FINRA Investor Education",
      url: "https://www.finra.org/investors"
    },
    {
      name: "r/investing - Reddit Investment Community",
      url: "https://www.reddit.com/r/investing/"
    }
  ]
};