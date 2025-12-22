from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from datetime import datetime, timedelta

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache = {}

@app.get("/")
async def root():
    return {"message" : "Hello world"}

@app.get("/v1/stock-history/{stock_ticker}")
async def get_stock_data(stock_ticker):
    try:
        if (stock_ticker in cache):
            print("cache hit for: ", stock_ticker)
            return cache[stock_ticker]
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
        cache[stock_ticker] = result;
        print(filtered_data)
        return result;
    except Exception as e:
        return {"error": f"Failed to fetch data for {stock_ticker}: {str(e)}"}
        