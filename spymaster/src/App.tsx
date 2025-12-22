import { useState } from "react";
import StockGraph, {
  type StockGraphProps,
  type StockPoint,
} from "./components/graph";
function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<StockGraphProps>({ data: [], symbol: "" });
  const [hasQueried, setHasQueried] = useState<boolean>(false);

  const fetchStockPrice = async (ticker: string) => {
    try {
      console.log("fetching stock price for ", ticker);
      setIsLoading(true);
      const response = await fetch(
        `http://127.0.0.1:8000/v1/stock-history/${ticker}`
      );
      const responseData = await response.json();
      setData({ data: responseData.data, symbol: ticker });
      setHasQueried(true);

      setIsLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
    }
  };

  const handleSubmission = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const ticker = (formData.get("ticker") as string)?.trim();
    if (ticker) {
      fetchStockPrice(ticker);
    }
  };
  const getColor = () => {
    return data.data[0] <= data.data[data.data.length - 1] ? "#008000" : "#FF0000";
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        gap: "10px",
      }}
      className="App"
    >
      <form onSubmit={handleSubmission}>
        <input name="ticker" type="text" placeholder="Enter stock ticker" />
        <button type="submit">Submit</button>
      </form>
      {isLoading ? (
        <div>is loading...</div>
      ) : hasQueried ? (
        <StockGraph data={data.data} symbol={data.symbol} color={getColor()}></StockGraph>
      ) : null}
    </div>
  );
}

export default App;
