import { NextResponse } from 'next/server';

const USER_URI = 'https://api.calendly.com/users/ad47fa77-7aee-4008-a4e2-279811bebb12';

export async function GET() {
  try {
    const token = process.env.CALENDLY_API_TOKEN;
    if (!token) {
      return NextResponse.json({ events: [] });
    }

    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const params = new URLSearchParams({
      user: USER_URI,
      min_start_time: now.toISOString(),
      max_start_time: in30Days.toISOString(),
      count: '100',
      status: 'active',
    });

    const response = await fetch(
      `https://api.calendly.com/scheduled_events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Calendly API error:', response.status, await response.text());
      return NextResponse.json({ events: [] });
    }

    const data = await response.json();

    const events = (data.collection || []).map((event: any) => {
      const loc = event.location;
      let location: string | undefined;
      if (loc) {
        location = loc.join_url || loc.location || loc.type || undefined;
      }
      return {
        id: event.uri?.split('/').pop() || '',
        title: event.name || 'Scheduled Event',
        start: event.start_time,
        end: event.end_time,
        status: event.status || 'active',
        location,
      };
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return NextResponse.json({ events: [] });
  }
}
