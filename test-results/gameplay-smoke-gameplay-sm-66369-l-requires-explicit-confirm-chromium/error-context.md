# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay-smoke.spec.ts >> gameplay smoke >> gameplay: Burn Connection modal requires explicit confirm
- Location: tests/e2e/gameplay-smoke.spec.ts:127:1

# Error details

```
TypeError: responderPage.getByTestId is not a function
```

# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - paragraph [ref=e7]: Karachi Coup
        - heading "Bluff. Setting. Rupees. Full Beizzati." [level=1] [ref=e8]
        - paragraph [ref=e9]: Host runs the table. Players join by room code. Hidden Connections stay private, public snapshots stay clean, and every response prompt is driven by the host-authoritative PeerJS room.
      - generic [ref=e10]:
        - generic [ref=e11]: ready
        - generic [ref=e12]: Turn Start · Host One is choosing a scene.
        - generic [ref=e13]: host:local:error:DECLARE_ACTION
    - generic [ref=e14]:
      - generic [ref=e16]:
        - img "Current scene" [ref=e17]
        - generic [ref=e18]:
          - paragraph [ref=e19]: Turn Start
          - heading "Host One is choosing a scene." [level=2] [ref=e20]
          - paragraph [ref=e21]:
            - text: "Turn:"
            - strong [ref=e22]: Host One
        - button "Rules" [ref=e24] [cursor=pointer]
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - paragraph [ref=e28]: Private
            - heading "Your Connections" [level=2] [ref=e29]
          - generic [ref=e31]:
            - generic [ref=e32]:
              - generic [ref=e33]: VECRN-0e790628
              - generic [ref=e34]: 2₹
              - generic [ref=e35]: 2 hidden
            - paragraph [ref=e36]:
              - text: "Elimination:"
              - strong [ref=e37]: Alive
            - paragraph [ref=e38]:
              - text: "Actions:"
              - strong [ref=e39]: Chai Paisa, Rishtedaar Help, Kiraya Collection, Police Wala Raid, Bhai Ka Scene, Zardaar Jugaad, Full Beizzati
            - generic [ref=e40]:
              - button "Police Wala Police Wala" [disabled] [ref=e41]:
                - img "Police Wala" [ref=e42]
                - generic [ref=e43]: Police Wala
              - button "Mumma Mumma" [disabled] [ref=e44]:
                - img "Mumma" [ref=e45]
                - generic [ref=e46]: Mumma
            - paragraph [ref=e47]: Your turn.
        - generic [ref=e48]:
          - generic [ref=e49]:
            - paragraph [ref=e50]: Actions
            - heading "Your move" [level=2] [ref=e51]
          - generic [ref=e54]:
            - button "Chai Paisa Chai Paisa Take 1 Rupee. No challenge. No block." [ref=e55] [cursor=pointer]:
              - img "Chai Paisa" [ref=e56]
              - generic [ref=e57]: Chai Paisa
              - generic [ref=e58]: Take 1 Rupee. No challenge. No block.
            - button "Rishtedaar Help Rishtedaar Help Take 2 Rupees. Malik Saab can block." [ref=e59] [cursor=pointer]:
              - img "Rishtedaar Help" [ref=e60]
              - generic [ref=e61]: Rishtedaar Help
              - generic [ref=e62]: Take 2 Rupees. Malik Saab can block.
            - button "Kiraya Collection Kiraya Collection Claim Malik Saab, take 3 Rupees." [ref=e63] [cursor=pointer]:
              - img "Kiraya Collection" [ref=e64]
              - generic [ref=e65]: Kiraya Collection
              - generic [ref=e66]: Claim Malik Saab, take 3 Rupees.
            - button "Police Wala Raid Police Wala Raid Claim Police Wala, target a player, steal up to 2 Rupees." [ref=e67] [cursor=pointer]:
              - img "Police Wala Raid" [ref=e68]
              - generic [ref=e69]: Police Wala Raid
              - generic [ref=e70]: Claim Police Wala, target a player, steal up to 2 Rupees.
            - button "Bhai Ka Scene Bhai Ka Scene Claim Bhai, pay 3 Rupees, target burns a Connection." [ref=e71] [cursor=pointer]:
              - img "Bhai Ka Scene" [ref=e72]
              - generic [ref=e73]: Bhai Ka Scene
              - generic [ref=e74]: Claim Bhai, pay 3 Rupees, target burns a Connection.
            - button "Zardaar Jugaad Zardaar Jugaad Claim Zardaar Chor, draw 2, return 2." [ref=e75] [cursor=pointer]:
              - img "Zardaar Jugaad" [ref=e76]
              - generic [ref=e77]: Zardaar Jugaad
              - generic [ref=e78]: Claim Zardaar Chor, draw 2, return 2.
            - button "Full Beizzati Full Beizzati Pay 7 Rupees, target burns a Connection. No challenge or block." [ref=e79] [cursor=pointer]:
              - img "Full Beizzati" [ref=e80]
              - generic [ref=e81]: Full Beizzati
              - generic [ref=e82]: Pay 7 Rupees, target burns a Connection. No challenge or block.
      - generic [ref=e84]:
        - generic [ref=e85]:
          - paragraph [ref=e86]: Public table
          - heading "Table roster" [level=2] [ref=e87]
        - generic [ref=e89]:
          - generic [ref=e90]:
            - img "Current scene" [ref=e91]
            - paragraph [ref=e92]: Host One is choosing a scene.
          - list [ref=e93]:
            - listitem [ref=e94]:
              - generic [ref=e95]:
                - strong [ref=e96]: Host One
                - generic [ref=e97]: VECRN-0e790628
              - generic [ref=e98]:
                - generic [ref=e99]: Turn
                - generic [ref=e100]: 2 Rupees
                - generic "2 hidden connections" [ref=e101]
                - generic "0 revealed connections"
            - listitem [ref=e104]:
              - generic [ref=e105]:
                - strong [ref=e106]: Bea
                - generic [ref=e107]: VECRN-1c013df9
              - generic [ref=e108]:
                - generic [ref=e109]: Ready
                - generic [ref=e110]: 2 Rupees
                - generic "2 hidden connections" [ref=e111]
                - generic "0 revealed connections"
            - listitem [ref=e114]:
              - generic [ref=e115]:
                - strong [ref=e116]: Ari
                - generic [ref=e117]: VECRN-5eae760f
              - generic [ref=e118]:
                - generic [ref=e119]: Ready
                - generic [ref=e120]: 2 Rupees
                - generic "2 hidden connections" [ref=e121]
                - generic "0 revealed connections"
      - generic [ref=e124]:
        - generic [ref=e125]:
          - generic [ref=e126]:
            - paragraph [ref=e127]: Response
            - heading "Waiting for the table" [level=2] [ref=e128]
          - paragraph [ref=e130]: Host-authoritative PeerJS. The host owns hidden state and validates every intent.
        - generic [ref=e131]:
          - generic [ref=e132]:
            - paragraph [ref=e133]: Log
            - heading "Action log" [level=2] [ref=e134]
          - generic [ref=e135]:
            - button "Expand log" [ref=e137] [cursor=pointer]
            - paragraph [ref=e138]: Recent scene history is tucked away to save space.
      - generic [ref=e139]:
        - button "Leave room" [ref=e140] [cursor=pointer]
        - generic [ref=e141]: host
    - generic [ref=e142]:
      - button "Leave room" [ref=e143] [cursor=pointer]
      - generic [ref=e144]: host
```

# Test source

```ts
  35  |   await expect(activePage.getByTestId('private-panel')).toBeVisible();
  36  |   await expect(activePage.getByTestId('public-player-table')).toBeVisible();
  37  |   await expect(activePage.getByTestId('action-log')).toBeVisible();
  38  | 
  39  |   await hostContext.close();
  40  |   await playerOneContext.close();
  41  |   await playerTwoContext.close();
  42  | });
  43  | 
  44  | test('gameplay: active player can take Chai Paisa and rupees update', async ({ browser }) => {
  45  |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  46  |   const name = await activePlayerName(hostPage);
  47  |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  48  | 
  49  |   await activePage.getByTestId('action-button-CHAI_PAISA').click();
  50  |   await waitForTurnName(hostPage, name === 'Ari' ? 'Bea' : 'Ari');
  51  |   await expect(activePage.getByTestId('private-panel')).toContainText('3₹');
  52  | 
  53  |   await hostContext.close();
  54  |   await playerOneContext.close();
  55  |   await playerTwoContext.close();
  56  | });
  57  | 
  58  | test('gameplay: Kiraya Collection does not open target picker', async ({ browser }) => {
  59  |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  60  |   const name = await activePlayerName(hostPage);
  61  |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  62  | 
  63  |   await activePage.getByTestId('action-button-KIRAYA_COLLECTION').click();
  64  |   await expect(activePage.getByTestId('target-picker')).toHaveCount(0);
  65  | 
  66  |   await hostContext.close();
  67  |   await playerOneContext.close();
  68  |   await playerTwoContext.close();
  69  | });
  70  | 
  71  | test('gameplay: challenge prompt shows Call Bakwaas and Let It Slide', async ({ browser }) => {
  72  |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  73  |   const name = await activePlayerName(hostPage);
  74  |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  75  |   const otherPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;
  76  | 
  77  |   await activePage.getByTestId('action-button-KIRAYA_COLLECTION').click();
  78  |   await expect(otherPage.getByTestId('response-call-bakwaas')).toBeVisible();
  79  |   await expect(otherPage.getByTestId('response-let-it-slide')).toBeVisible();
  80  | 
  81  |   await hostContext.close();
  82  |   await playerOneContext.close();
  83  |   await playerTwoContext.close();
  84  | });
  85  | 
  86  | test('gameplay: Police Wala Raid opens target picker', async ({ browser }) => {
  87  |   const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  88  |   const name = await activePlayerName(hostPage);
  89  |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  90  | 
  91  |   await activePage.getByTestId('action-button-POLICE_WALA_RAID').click();
  92  |   await expect(activePage.getByTestId('target-picker')).toBeVisible();
  93  | 
  94  |   await hostContext.close();
  95  |   await playerOneContext.close();
  96  |   await playerTwoContext.close();
  97  | });
  98  | 
  99  | test('gameplay: block prompt shows only legal Use Setting roles', async ({ browser }) => {
  100 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  101 |   const name = await activePlayerName(hostPage);
  102 |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  103 |   const otherPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;
  104 | 
  105 |   await activePage.getByTestId('action-button-RISHTEDAAR_HELP').click();
  106 |   await expect(otherPage.getByTestId('response-block-MALIK_SAAB')).toBeVisible();
  107 |   await expect(otherPage.getByTestId('response-let-it-slide')).toBeVisible();
  108 | 
  109 |   await hostContext.close();
  110 |   await playerOneContext.close();
  111 |   await playerTwoContext.close();
  112 | });
  113 | 
  114 | test('gameplay: Bhai Ka Scene opens target picker', async ({ browser }) => {
  115 |   const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  116 |   const name = await activePlayerName(hostPage);
  117 |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  118 | 
  119 |   await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  120 |   await expect(activePage.getByTestId('target-picker')).toBeVisible();
  121 | 
  122 |   await hostContext.close();
  123 |   await playerOneContext.close();
  124 |   await playerTwoContext.close();
  125 | });
  126 | 
  127 | test('gameplay: Burn Connection modal requires explicit confirm', async ({ browser }) => {
  128 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  129 |   const activeName = await activePlayerName(hostPage);
  130 |   const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
  131 | 
  132 |   await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  133 |   const targetName = await selectFirstTarget(activePage);
  134 |   const responderPage = pageForPlayerName(targetName, hostPage, playerOnePage, playerTwoPage);
> 135 |   await responderPage.getByTestId('response-let-it-slide').click();
      |                       ^ TypeError: responderPage.getByTestId is not a function
  136 |   await expect(responderPage.getByTestId('response-let-it-slide')).toBeVisible();
  137 |   await responderPage.getByTestId('response-let-it-slide').click();
  138 |   const burnPage = await visiblePageWithTestId('burn-modal', [hostPage, playerOnePage, playerTwoPage]);
  139 |   await expect(burnPage.getByRole('button', { name: 'Confirm burn' })).toBeDisabled();
  140 | 
  141 |   await hostContext.close();
  142 |   await playerOneContext.close();
  143 |   await playerTwoContext.close();
  144 | });
  145 | 
  146 | test('gameplay: Full Beizzati opens target picker when affordable', async ({ browser }) => {
  147 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  148 | 
  149 |   const nextTurnName = (name: string) => (name === 'Host One' ? 'Ari' : name === 'Ari' ? 'Bea' : 'Host One');
  150 | 
  151 |   for (let index = 0; index < 15; index += 1) {
  152 |     const activeName = await activePlayerName(hostPage);
  153 |     const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
  154 |     await activePage.getByTestId('action-button-CHAI_PAISA').click();
  155 |     await waitForTurnName(hostPage, nextTurnName(activeName));
  156 |   }
  157 | 
  158 |   const name = await activePlayerName(hostPage);
  159 |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  160 |   await expect(activePage.getByTestId('action-button-FULL_BEIZZATI')).toBeVisible();
  161 |   await activePage.getByTestId('action-button-FULL_BEIZZATI').click();
  162 |   await expect(activePage.getByTestId('target-picker')).toBeVisible();
  163 | 
  164 |   await hostContext.close();
  165 |   await playerOneContext.close();
  166 |   await playerTwoContext.close();
  167 | });
  168 | 
  169 | test('gameplay: Zardaar Jugaad modal requires exactly two returned Connections', async ({ browser }) => {
  170 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  171 |   const activeName = await activePlayerName(hostPage);
  172 |   const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
  173 | 
  174 |   await activePage.getByTestId('action-button-ZARDAAR_JUGAAD').click();
  175 |   const firstResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage));
  176 |   await firstResponderPage.getByTestId('response-let-it-slide').click();
  177 |   const secondResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage && page !== firstResponderPage));
  178 |   await secondResponderPage.getByTestId('response-let-it-slide').click();
  179 |   await expect(activePage.getByTestId('jugaad-modal')).toBeVisible();
  180 |   await expect(activePage.getByTestId('jugaad-submit-return')).toBeDisabled();
  181 | 
  182 |   await hostContext.close();
  183 |   await playerOneContext.close();
  184 |   await playerTwoContext.close();
  185 | });
  186 | 
  187 | test('gameplay: Zardaar Jugaad opens return modal after challenge passes', async ({ browser }) => {
  188 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  189 |   const activeName = await activePlayerName(hostPage);
  190 |   const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
  191 | 
  192 |   await activePage.getByTestId('action-button-ZARDAAR_JUGAAD').click();
  193 |   const firstResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage));
  194 |   await firstResponderPage.getByTestId('response-let-it-slide').click();
  195 |   const secondResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage && page !== firstResponderPage));
  196 |   await secondResponderPage.getByTestId('response-let-it-slide').click();
  197 |   await expect(activePage.getByTestId('jugaad-modal')).toBeVisible();
  198 | 
  199 |   await hostContext.close();
  200 |   await playerOneContext.close();
  201 |   await playerTwoContext.close();
  202 | });
  203 | 
  204 | test('visual: opponent hidden Connections render as card backs, not role cards', async ({ browser }) => {
  205 |   const { hostContext, hostPage, playerOneContext, playerTwoContext } = await createThreePlayerGame(browser);
  206 | 
  207 |   await expect(hostPage.getByTestId('player-hidden-count').locator('.card-stack--hidden')).toHaveCount(6);
  208 |   await expect(hostPage.getByTestId('player-revealed-connections').locator('img')).toHaveCount(0);
  209 | 
  210 |   await hostContext.close();
  211 |   await playerOneContext.close();
  212 |   await playerTwoContext.close();
  213 | });
  214 | 
  215 | test('visual: burned Connections render actual role art with burned overlay', async ({ browser }) => {
  216 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  217 |   const activeName = await activePlayerName(hostPage);
  218 |   const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
  219 | 
  220 |   await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  221 |   const targetName = await selectFirstTarget(activePage);
  222 |   const responderPage = pageForPlayerName(targetName, hostPage, playerOnePage, playerTwoPage);
  223 |   await responderPage.getByTestId('response-let-it-slide').click();
  224 |   await expect(responderPage.getByTestId('response-let-it-slide')).toBeVisible();
  225 |   await responderPage.getByTestId('response-let-it-slide').click();
  226 |   const burnPage = await visiblePageWithTestId('burn-modal', [hostPage, playerOnePage, playerTwoPage]);
  227 |   await burnPage.getByTestId('burn-connection-option').first().click();
  228 |   await expect(burnPage.getByRole('button', { name: 'Confirm burn' })).toBeEnabled();
  229 |   await burnPage.getByRole('button', { name: 'Confirm burn' }).click();
  230 |   await expect(hostPage.getByTestId('player-revealed-connections').locator('img')).toHaveCount(3);
  231 | 
  232 |   await hostContext.close();
  233 |   await playerOneContext.close();
  234 |   await playerTwoContext.close();
  235 | });
```