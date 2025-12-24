from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from dotenv import load_dotenv
from datetime import datetime, timedelta
import os
import finnhub

load_dotenv()
FINN_HUB_KEY = os.getenv('FINN_HUB_KEY')
finnhub_client = finnhub.Client(api_key=FINN_HUB_KEY)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

price_cache = {}
news_cache = {}

@app.get("/")
async def root():
    return {"message" : "Hello world"}

@app.get("/v1/stock-history/{stock_ticker}")
async def get_stock_data(stock_ticker):
    try:
        if (stock_ticker in price_cache):
            print("price cache hit for: ", stock_ticker)
            return price_cache[stock_ticker]
        ticker = yf.Ticker(stock_ticker)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        hist = ticker.history(start=start_date, end=end_date, interval='1h')
        filtered_data = []
        for index, row in hist.iterrows():
            filtered_data.append({
                "time": int(index.timestamp()),
                "value": row['Close']
            })
        filtered_data.sort(key=lambda x: x["time"])
        result = {
            "ticker": stock_ticker,
            "data" : filtered_data
        }
        price_cache[stock_ticker] = result;
        return result;
    except Exception as e:
        return {"error": f"Failed to fetch data for {stock_ticker}: {str(e)}"}
@app.get("/v1/stock-news/{stock_ticker}")
async def get_stock_news(stock_ticker):
   try:
    if (stock_ticker in news_cache):
        print("news cache hit for: ", stock_ticker)
        return news_cache[stock_ticker]
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    news = finnhub_client.company_news(stock_ticker, _from=start_date, to=end_date)
    news_cache[stock_ticker] = news
    result = {
        "ticker": stock_ticker,
        "data" : news
    }
    return result 
       
   except Exception as e: 
        return {"error": f"Failed to fetch data for {stock_ticker}: {str(e)}"}