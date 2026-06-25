import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsAPI } from "../../services/api";

export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await notificationsAPI.getAll();
      return response.data;
    },
    refetchInterval: 60000, // Auto refetch every 1 minute
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: async () => {
      const response = await notificationsAPI.getUnreadCount();
      return response.data;
    },
    refetchInterval: 30000, // Auto refetch every 30 seconds
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await notificationsAPI.markAsRead(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await notificationsAPI.markAllAsRead();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await notificationsAPI.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
