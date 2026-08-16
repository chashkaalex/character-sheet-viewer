describe('Rolz.org API Formatter & Connection', () => {
  // Helper function to format the string
  function formatRollMessageForRolzApi(text: string): string {
    let apiText = text;
    if (text.startsWith('#')) {
      const parts = text.split(' ').map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        const diceExpr = parts[0].substring(1); // remove leading '#'
        const labelParts = parts.slice(1).map(p => p.startsWith('#') ? p.substring(1) : p);
        const label = labelParts.join(' ');
        apiText = label ? `${label} [${diceExpr}]` : `[${diceExpr}]`;
      }
    }
    return apiText;
  }

  test('should format standard Rolz room commands to inline brackets API format', () => {
    expect(formatRollMessageForRolzApi('#d20+5 #Str Check')).toBe('Str Check [d20+5]');
    expect(formatRollMessageForRolzApi('#1d8+5 #Waraxe Damage')).toBe('Waraxe Damage [1d8+5]');
    expect(formatRollMessageForRolzApi('#d20+6 #Reflex')).toBe('Reflex [d20+6]');
    expect(formatRollMessageForRolzApi('#d20+12')).toBe('[d20+12]');
    expect(formatRollMessageForRolzApi('Just text')).toBe('Just text');
  });

  test('should successfully execute a live roll request to Rolz.org using converted format', async () => {
    const rawText = '#d20+5 #Str Check';
    const apiText = formatRollMessageForRolzApi(rawText);
    expect(apiText).toBe('Str Check [d20+5]');

    const url = 'https://rolz.org/api/post';
    const params = new URLSearchParams();
    params.append('room', 'oy2gymrcju');
    params.append('text', apiText);
    params.append('from', 'Jest Local Test');

    const response = await fetch(url, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    expect(response.status).toBe(200);
    const responseText = await response.text();
    const data = JSON.parse(responseText);

    expect(data.cmd).toBe('send');
    expect(data.message).toBeDefined();
    expect(data.message.content).toBeDefined();

    const item = data.message.content.items?.[0];
    expect(item).toBeDefined();
    expect(item.type).toBe('dicemsg');
    expect(item.input).toBe('d20+5');
    expect(item.pre).toBe('Str Check ');
    expect(Number(item.result)).toBeGreaterThanOrEqual(6);
    expect(Number(item.result)).toBeLessThanOrEqual(25);
  });
});
