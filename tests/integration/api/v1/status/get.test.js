test("GET to /api/v1/status should return 200", async () => {
  const response = await fetch("http://localhost:3000/api/v1/status");
  expect(response.status).toBe(200);
  expect(response.ok).toBe(true);
  const responseBody = await response.json();
  console.log(responseBody);
  const parsedDate = new Date(responseBody.updated_at).toISOString();
  expect(responseBody.updated_at).toEqual(parsedDate);
  expect(responseBody.dependencies.database.version).toEqual("16.2");
  expect(responseBody.dependencies.database.max_connections).toEqual(100);
  expect(responseBody.dependencies.database.opened_connections).toBe(0);
});
