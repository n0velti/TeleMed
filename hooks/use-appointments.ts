import type { Schema } from '@/amplify/data/resource';
import { getCurrentAuthUser } from '@/lib/auth';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { useCallback, useState } from 'react';

// Lazy initialization of the client
const getClient = () => {
  return generateClient<Schema>();
}

export interface Appointment {
  id?: string;
  owner?: string;
  userId?: string;
  userEmail?: string;
  specialistId?: string;
  specialistName?: string;
  specialistSpecialty?: string;
  specialistPrice?: number;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  purpose?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
}

export interface CreateAppointmentInput {
  specialistId: string;
  specialistName: string;
  specialistSpecialty: string;
  specialistPrice: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: string;
  purpose: string;
}

export interface UseAppointmentsReturn {
  appointments: Appointment[];
  isLoading: boolean;
  error: Error | null;
  createAppointment: (input: CreateAppointmentInput) => Promise<{ success: boolean; data?: Appointment; error?: string }>;
  fetchAppointments: () => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<{ success: boolean; error?: string }>;
  deleteAppointment: (id: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Custom hook for managing appointments with proper authentication
 * Provides reactive appointment state and CRUD operations
 */
export function useAppointments(): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Get current user information for appointment creation
   */
  const getCurrentUser = useCallback(async () => {
    try {
      const { user, error: userError } = await getCurrentAuthUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      
      let userEmail = '';
      try {
        const attributes = await fetchUserAttributes();
        userEmail = attributes.email || user.signInDetails?.loginId || user.username || '';
      } catch (attrError) {
        userEmail = user.signInDetails?.loginId || user.username || '';
      }
      
      return {
        userId: user.userId || user.username,
        userEmail,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }, []);

  /**
   * Create a new appointment
   */
  const createAppointment = useCallback(async (input: CreateAppointmentInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const client = getClient();
      const { userId, userEmail } = await getCurrentUser();
      const now = new Date().toISOString();
      
      const { data: appointment, errors } = await client.models.Appointment.create({
        owner: userId,
        userId: userId,
        userEmail: userEmail,
        specialistId: input.specialistId,
        specialistName: input.specialistName,
        specialistSpecialty: input.specialistSpecialty,
        specialistPrice: input.specialistPrice,
        appointmentDate: input.appointmentDate,
        startTime: input.startTime,
        endTime: input.endTime,
        duration: input.duration,
        purpose: input.purpose,
        status: 'confirmed',
        createdAt: now,
        updatedAt: now,
      });
      
      if (errors) {
        console.error('Error creating appointment:', errors);
        setError(new Error('Failed to create appointment'));
        setIsLoading(false);
        return { 
          success: false, 
          error: errors.map(e => e.message).join(', ') 
        };
      }
      
      // Add to local state
      setAppointments(prev => [...prev, appointment as Appointment]);
      setIsLoading(false);
      return { success: true, data: appointment as Appointment };
    } catch (err) {
      console.error('Error creating appointment:', err);
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }, [getCurrentUser]);

  /**
   * Fetch all appointments for the current user
   */
  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const client = getClient();
      const { data: fetchedAppointments, errors } = await client.models.Appointment.list({
        selectionSet: [
          'id',
          'owner',
          'userId',
          'userEmail',
          'specialistId',
          'specialistName',
          'specialistSpecialty',
          'specialistPrice',
          'appointmentDate',
          'startTime',
          'endTime',
          'duration',
          'purpose',
          'status',
          'createdAt',
          'updatedAt',
          'notes',
        ],
      });
      
      if (errors) {
        console.error('Error fetching appointments:', errors);
        setError(new Error('Failed to fetch appointments'));
        setIsLoading(false);
        return;
      }
      
      setAppointments(fetchedAppointments as Appointment[]);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      setIsLoading(false);
    }
  }, []);

  /**
   * Update an existing appointment
   */
  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const client = getClient();
      const { errors } = await client.models.Appointment.update({
        id,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      
      if (errors) {
        console.error('Error updating appointment:', errors);
        setError(new Error('Failed to update appointment'));
        setIsLoading(false);
        return { 
          success: false, 
          error: errors.map(e => e.message).join(', ') 
        };
      }
      
      // Update local state
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
      );
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Error updating appointment:', err);
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }, []);

  /**
   * Delete an appointment
   */
  const deleteAppointment = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const client = getClient();
      const { errors } = await client.models.Appointment.delete({ id });
      
      if (errors) {
        console.error('Error deleting appointment:', errors);
        setError(new Error('Failed to delete appointment'));
        setIsLoading(false);
        return { 
          success: false, 
          error: errors.map(e => e.message).join(', ') 
        };
      }
      
      // Remove from local state
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Error deleting appointment:', err);
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }, []);

  return {
    appointments,
    isLoading,
    error,
    createAppointment,
    fetchAppointments,
    updateAppointment,
    deleteAppointment,
  };
}

