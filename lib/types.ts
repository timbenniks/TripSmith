export interface Flight {
  date: string;
  flightNumber: string;
  route: {
    from: string;
    to: string;
  };
  departure: string;
  arrival: string;
  terminal?: string;
  links?: {
    googleFlights?: string;
  };
}

export interface Accommodation {
  property: string;
  address: string;
  checkIn: string;
  checkOut: string;
  contact?: string;
  links?: {
    googleMaps?: string;
    booking?: string;
  };
}

export interface Activity {
  time: string;
  activity: string;
  location: string;
  duration?: string;
  travelBuffer?: string;
  notes?: string;
}

export interface TransportPlan {
  route: string;
  primaryOption: string;
  estimatedTime: string;
  fallbackOption?: string;
  notes?: string;
}

export interface ExpenseCategory {
  category: string;
  estimatedCost: number;
  notes?: string;
  tips?: string;
}

export interface HelpfulNote {
  category: string;
  information: string;
  tips?: string;
}

export interface StructuredItinerary {
  tripHeader?: {
    travelerName?: string;
    destination: string;
    dates: string;
    lastUpdated: string;
  };
  flights?: Flight[];
  accommodation?: Accommodation[];
  transportPlans?: TransportPlan[];
  dailySchedule?: Activity[];
  expenses?: {
    total?: number;
    breakdown: ExpenseCategory[];
  };
  helpfulNotes?: HelpfulNote[];
}

export interface HybridResponse {
  markdown: string;
  structured?: StructuredItinerary;
}
