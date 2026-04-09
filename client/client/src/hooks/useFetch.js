import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const useFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(url, { params: options.params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(options.params)]);

  useEffect(() => {
    if (options.skip) return;
    fetchData();
  }, [fetchData, options.skip]);

  return { data, loading, error, refetch: fetchData };
};

export default useFetch;
