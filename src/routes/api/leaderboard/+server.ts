import type { RequestHandler } from '@sveltejs/kit';
import { addEntry, getEntries } from '$lib/database';

export const POST: RequestHandler = async ({ request }) => {
    const { name, link, time } = await request.json();
    await addEntry(name, link, time);
    return new Response(JSON.stringify({ message: 'Entry added successfully' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const GET: RequestHandler = async ({ url }) => {
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const entries = await getEntries(limit, offset);
    return new Response(JSON.stringify({ entries }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};