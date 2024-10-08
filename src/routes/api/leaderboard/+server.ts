import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
    const { name, link, time, items, hardmode } = await request.json();
    let result = await platform?.env.LEADERBOARD_DB.prepare(`INSERT INTO leaderboard (name, link, time, items, hardmode) VALUES ('${name}', '${link}', ${time}, ${items}, ${hardmode})`).run();
    return new Response(JSON.stringify({ message: 'Entry added successfully' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const GET: RequestHandler = async ({ url, platform }) => {
    const getAll = url.searchParams.get('all') === 'true';
    if (getAll) {
        const { results } = await platform?.env.LEADERBOARD_DB.prepare('SELECT * FROM leaderboard').all();
        return new Response(JSON.stringify({ results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const hardMode = url.searchParams.get('hardmode') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const { results } = await platform?.env.LEADERBOARD_DB.prepare(`SELECT * FROM leaderboard ${hardMode ? 'WHERE hardmode = 1' : ''} ORDER BY time ASC, items ASC LIMIT ${limit} OFFSET ${offset}`).all();
    return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};