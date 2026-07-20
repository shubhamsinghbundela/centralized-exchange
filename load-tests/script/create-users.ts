const BASE_URL = "http://159.89.173.75:3000";

(async () => {
  const tokens: string[] = [];

  for (let i = 1; i <= 100; i++) {
    const res = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: `user${i + 201}`,
        password: "password123",
      }),
    });

    const data = await res.json();

    if (data.token) {
      tokens.push(data.token);
      console.log(`Created user${i}`);
    }
  }

  console.log(`export default ${JSON.stringify(tokens, null, 2)};`);
})();
