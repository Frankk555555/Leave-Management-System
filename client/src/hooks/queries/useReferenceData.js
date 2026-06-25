import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leaveTypesAPI, departmentsAPI, facultiesAPI } from "../../services/api";

// Leave Types
export const useLeaveTypes = () => {
  return useQuery({
    queryKey: ["leaveTypes"],
    queryFn: async () => {
      const response = await leaveTypesAPI.getAll();
      return response.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // Very stable data, cache for 24h
  });
};

// Departments
export const useDepartments = (facultyId) => {
  return useQuery({
    queryKey: ["departments", facultyId],
    queryFn: async () => {
      const response = await departmentsAPI.getAll(facultyId);
      return response.data;
    },
    staleTime: 24 * 60 * 60 * 1000, 
    enabled: !!facultyId && facultyId !== "all",
  });
};

// Faculties
export const useFaculties = () => {
  return useQuery({
    queryKey: ["faculties"],
    queryFn: async () => {
      const response = await facultiesAPI.getAll();
      return response.data;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
};
