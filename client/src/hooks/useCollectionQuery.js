import { useState, useMemo, useCallback } from "react";

/**
 * Deep helper to safely extract nested property values (e.g. 'user.department.name')
 */
const getNestedValue = (obj, path) => {
  if (!obj || !path) return "";
  return path
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : ""),
      obj
    );
};

/**
 * Deep Hook: useCollectionQuery
 * Provides unified client-side search, multi-facet filtering, sorting,
 * pagination, and dynamic statistics calculation across collections.
 */
export function useCollectionQuery(items = [], options = {}) {
  const {
    initialSearch = "",
    searchFields = [],
    initialFilters = {},
    filterExtractors = {},
    initialSort = null,
    initialPage = 1,
    pageSize = null,
    statsConfig = null,
  } = options;

  const [search, setSearchState] = useState(initialSearch);
  const [filters, setFiltersState] = useState(initialFilters);
  const [sort, setSortState] = useState(initialSort);
  const [page, setPageState] = useState(initialPage);

  const setSearch = useCallback((s) => {
    setSearchState(s);
    setPageState(1);
  }, []);

  const setFilter = useCallback((key, value) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPageState(1);
  }, []);

  const setFilters = useCallback((updater) => {
    setFiltersState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
    setPageState(1);
  }, []);

  const setSort = useCallback((s) => {
    setSortState(s);
    setPageState(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchState(initialSearch);
    setFiltersState(initialFilters);
    setSortState(initialSort);
    setPageState(1);
  }, [initialSearch, initialFilters, initialSort]);

  // Compute filtered & sorted collection
  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];

    return items
      .filter((item) => {
        // 1. Universal multi-field search
        if (search && search.trim() !== "") {
          const q = search.toLowerCase().trim();
          if (searchFields.length > 0) {
            const matches = searchFields.some((field) => {
              if (typeof field === "function") {
                const val = field(item);
                return String(val || "")
                  .toLowerCase()
                  .includes(q);
              }
              const val = getNestedValue(item, field);
              return String(val || "")
                .toLowerCase()
                .includes(q);
            });
            if (!matches) return false;
          }
        }

        // 2. Multi-facet filters
        for (const [key, filterValue] of Object.entries(filters)) {
          if (
            filterValue === undefined ||
            filterValue === null ||
            filterValue === "all" ||
            filterValue === ""
          ) {
            continue;
          }

          if (typeof filterValue === "function") {
            if (!filterValue(item)) return false;
          } else {
            const extractor = filterExtractors[key];
            const itemVal =
              typeof extractor === "function"
                ? extractor(item)
                : getNestedValue(item, key);
            if (String(itemVal) !== String(filterValue)) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (!sort || !sort.field) return 0;
        const valA = getNestedValue(a, sort.field);
        const valB = getNestedValue(b, sort.field);

        let comparison = 0;
        if (typeof valA === "string" && typeof valB === "string") {
          comparison = valA.localeCompare(valB, "th-TH", { numeric: true });
        } else if (typeof valA === "number" && typeof valB === "number") {
          comparison = valA - valB;
        } else if (valA instanceof Date || valB instanceof Date) {
          comparison = new Date(valA || 0) - new Date(valB || 0);
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }

        return sort.direction === "desc" ? -comparison : comparison;
      });
  }, [items, search, searchFields, filters, sort]);

  // Compute dynamic statistics
  const stats = useMemo(() => {
    if (!statsConfig || !Array.isArray(items)) {
      return { total: (items || []).length };
    }

    const res = { total: items.length };
    for (const [statKey, evaluator] of Object.entries(statsConfig)) {
      if (typeof evaluator === "function") {
        res[statKey] = items.filter(evaluator).length;
      } else if (
        typeof evaluator === "object" &&
        evaluator.field &&
        evaluator.value !== undefined
      ) {
        res[statKey] = items.filter(
          (item) =>
            String(getNestedValue(item, evaluator.field)) ===
            String(evaluator.value)
        ).length;
      }
    }
    return res;
  }, [items, statsConfig]);

  // Compute paginated slice
  const paginatedItems = useMemo(() => {
    if (!pageSize) return filteredItems;
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const totalPages = pageSize
    ? Math.ceil(filteredItems.length / pageSize) || 1
    : 1;

  return {
    items: filteredItems,
    paginatedItems,
    stats,
    search,
    setSearch,
    filters,
    setFilter,
    setFilters,
    resetFilters,
    sort,
    setSort,
    page,
    setPage: setPageState,
    pageSize,
    totalPages,
    totalItems: filteredItems.length,
  };
}

export default useCollectionQuery;
