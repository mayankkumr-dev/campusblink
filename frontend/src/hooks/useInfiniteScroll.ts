import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseInfiniteScrollOptions<T> {
  fetchData: (page: number) => Promise<{ data: T[]; hasMore: boolean }>;
  initialPage?: number;
}

export function useInfiniteScroll<T>({ fetchData, initialPage = 1 }: UseInfiniteScrollOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore) return;
    
    setIsFetching(true);
    setError(null);
    try {
      const response = await fetchData(page);
      setData((prev) => [...prev, ...response.data]);
      setHasMore(response.hasMore);
      if (response.hasMore) {
        setPage((prev) => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error fetching data'));
    } finally {
      setIsFetching(false);
    }
  }, [fetchData, page, hasMore, isFetching]);

  useEffect(() => {
    // Initial fetch on mount
    if (page === initialPage && data.length === 0) {
      loadMore();
    }
  }, [initialPage, loadMore, page, data.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isFetching]);

  const refresh = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    setIsFetching(false);
  }, [initialPage]);

  return { data, hasMore, isFetching, error, observerTarget, refresh };
}
