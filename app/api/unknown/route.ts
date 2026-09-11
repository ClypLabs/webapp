// Where api.clypdat.xyz sends any path it does not serve (see the rewrites in
// next.config.ts), so the API host answers in JSON rather than rendering the
// marketing site's HTML 404.

function notFound() {
  return new Response(
    JSON.stringify(
      {
        error: "Not found",
        docs: "https://api.clypdat.xyz/",
        endpoints: ["/v1/stats/clips"],
      },
      null,
      2,
    ),
    { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
