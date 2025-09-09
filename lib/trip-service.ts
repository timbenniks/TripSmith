import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { TripDetails } from '@/components/trip-form';
import { StructuredItinerary } from '@/lib/types';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Trip {
  id: string;
  user_id: string;
  name: string;
  destination: string;
  travel_dates: {
    from?: string;
    to?: string;
    formatted?: string;
  };
  purpose: string;
  status: 'planning' | 'booked' | 'completed';
  chat_history: Message[];
  itinerary_data?: StructuredItinerary;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class TripService {
  private supabaseClient = supabase;

  /**
   * Create a new trip record in the database
   */
  async createTrip(user: User, tripData: TripDetails): Promise<Trip | null> {
    try {
      // Parse travel dates if they exist
      const travel_dates = tripData.travelDates ? {
        formatted: tripData.travelDates,
        // Try to extract from/to dates from formatted string
        from: this.extractFromDate(tripData.travelDates),
        to: this.extractToDate(tripData.travelDates)
      } : {};

      const { data, error } = await this.supabaseClient
        .from('trips')
        .insert({
          user_id: user.id,
          name: user.user_metadata?.full_name || user.email || `Trip to ${tripData.destination}`,
          destination: tripData.destination,
          travel_dates,
          purpose: tripData.purpose,
          status: 'planning',
          chat_history: [],
          preferences: {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating trip:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createTrip:', error);
      return null;
    }
  }

  /**
   * Update trip chat history with new messages
   */
  async updateTripChatHistory(tripId: string, messages: Message[]): Promise<boolean> {
    try {
      const { error } = await this.supabaseClient
        .from('trips')
        .update({
          chat_history: messages,
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) {
        console.error('Error updating trip chat history:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTripChatHistory:', error);
      return false;
    }
  }

  /**
   * Get a trip by ID
   */
  async getTripById(tripId: string): Promise<Trip | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) {
        console.error('Error fetching trip:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTripById:', error);
      return null;
    }
  }

  /**
   * Update trip status
   */
  async updateTripStatus(tripId: string, status: 'planning' | 'booked' | 'completed'): Promise<boolean> {
    try {
      const { error } = await this.supabaseClient
        .from('trips')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) {
        console.error('Error updating trip status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTripStatus:', error);
      return false;
    }
  }

  /**
   * Update trip itinerary data with structured information
   */
  async updateTripItineraryData(tripId: string, itineraryData: StructuredItinerary): Promise<boolean> {
    try {
      const { error } = await this.supabaseClient
        .from('trips')
        .update({
          itinerary_data: itineraryData,
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) {
        console.error('Error updating trip itinerary data:', error);
        return false;
      }

      console.log('Successfully updated trip itinerary data for trip:', tripId);
      return true;
    } catch (error) {
      console.error('Error in updateTripItineraryData:', error);
      return false;
    }
  }

  /**
   * Get all trips for a user
   */
  async getUserTrips(userId: string): Promise<Trip[]> {
    try {
      const { data, error } = await this.supabaseClient
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching user trips:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserTrips:', error);
      return [];
    }
  }

  /**
   * Update trip details
   */
  async updateTripDetails(tripId: string, updates: Partial<Omit<Trip, 'id' | 'user_id' | 'created_at'>>): Promise<boolean> {
    try {
      const { error } = await this.supabaseClient
        .from('trips')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) {
        console.error('Error updating trip details:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTripDetails:', error);
      return false;
    }
  }

  /**
   * Delete a trip
   */
  async deleteTrip(tripId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseClient
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) {
        console.error('Error deleting trip:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteTrip:', error);
      return false;
    }
  }

  /**
   * Extract from date from formatted travel dates string
   */
  private extractFromDate(travelDates: string): string | undefined {
    // Format: "MMM d, yyyy - MMM d, yyyy"
    const match = travelDates.match(/^(.+?)\s*-\s*(.+)$/);
    if (match) {
      try {
        const fromDateStr = match[1].trim();
        const date = new Date(fromDateStr);
        return date.toISOString().split('T')[0];
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Extract to date from formatted travel dates string
   */
  private extractToDate(travelDates: string): string | undefined {
    // Format: "MMM d, yyyy - MMM d, yyyy"
    const match = travelDates.match(/^(.+?)\s*-\s*(.+)$/);
    if (match) {
      try {
        const toDateStr = match[2].trim();
        const date = new Date(toDateStr);
        return date.toISOString().split('T')[0];
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

// Export singleton instance
export const tripService = new TripService();
