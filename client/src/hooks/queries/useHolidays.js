import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { holidaysAPI } from "../../services/api";

export const useHolidays = (year) => {
  return useQuery({
    queryKey: ["holidays", year],
    queryFn: async () => {
      const response = await holidaysAPI.getAll(year);
      return response.data;
    },
  });
};

export const useCreateHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await holidaysAPI.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
};

export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await holidaysAPI.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await holidaysAPI.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
};
