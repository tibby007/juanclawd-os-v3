import { NextResponse } from 'next/server';

// TODO: Wire to Calendly API when credentials are available
// For now, return empty array - Command Center handles this gracefully

export async function GET() {
  try {
    const calendlyToken = process.env.CALENDLY_API_TOKEN;
    
    if (!calendlyToken) {
      return NextResponse.json({ events: [] });
    }
    
    // Fetch from Calendly API
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const response = await fetch(
      `https://api.calendly.com/scheduled_events?min_start_time=${today.toISOString()}&max_start_time=${tomorrow.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${calendlyToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      return NextResponse.json({ events: [] });
    }
    
    const data = await response.json();
    const events = data.collection?.map((event: any) => ({
      title: event.name || 'Scheduled Event',
      start: event.start_time,
      end: event.end_time,
    })) || [];
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return NextResponse.json({ events: [] });
  }
}
