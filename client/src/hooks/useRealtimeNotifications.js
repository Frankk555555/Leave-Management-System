import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/common/Toast";
import config from "../config";

/**
 * Hook for consuming Server-Sent Events (SSE) real-time notifications
 */
export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user || !token) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const streamUrl = `${config.API_URL}/api/notifications/stream?token=${encodeURIComponent(token)}`;

    let es = null;

    try {
      es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.addEventListener("connected", () => {
        setIsConnected(true);
      });

      es.addEventListener("notification", (e) => {
        try {
          const data = JSON.parse(e.data);

          // 1. Immediately invalidate and refetch React Query notification cache
          queryClient.invalidateQueries({ queryKey: ["notifications"] });

          // 2. Show in-app Toast alert
          if (data && data.message) {
            toast.info(data.message);
          }

          // 3. Dispatch custom browser event for other listeners
          window.dispatchEvent(
            new CustomEvent("realtimeNotification", { detail: data })
          );
        } catch (err) {
          console.error("[SSE] Error parsing notification event:", err);
        }
      });

      es.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.error("[SSE] Failed to initialize EventSource:", err);
    }

    return () => {
      if (es) {
        es.close();
      }
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [user, queryClient, toast]);

  return { isConnected };
};

export default useRealtimeNotifications;
