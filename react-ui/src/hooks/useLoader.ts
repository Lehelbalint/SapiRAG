import { useState } from "react";

export const useLoader = () => {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const runWithLoader = async (task: () => Promise<void>, text: string) => {
    setLoadingText(text);
    setLoading(true);
    try {
      await task();
    } finally {
      setLoading(false);
    }
  };

  return { loading, loadingText, runWithLoader };
};