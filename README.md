# Leaderboard Demo for Fastly Fanout

This application demonstrates the use of [Fastly Fanout](https://docs.fastly.com/products/fanout) to maintain a leaderboard and update it across devices in real time.

A live instance of this demo can be found at [leaderboard-demo.edgecompute.app](https://leaderboard-demo.edgecompute.app/).

## Overview

To enable realtime updates, [Fastly Fanout](https://docs.fastly.com/products/fanout) is positioned as a [GRIP (Generic Realtime Intermediary Protocol)](https://pushpin.org/docs/protocols/grip/) proxy. Responses for streaming requests are held open by Fanout. Then, as updates become ready, the backend application publishes these updates through Fanout to all connected clients. For details on this mechanism, see [Real-time Updates](#real-time-updates) below.

The project comprises two main parts:

* A web application. The backend for this web application is written in JavaScript, for [Node.js](https://nodejs.dev/) 18.x or newer.
   * It uses the [Express](https://expressjs.com/) web framework and uses [SQLite](https://www.sqlite.org/) to maintain a small database.
   * The frontend for this web application is a [React](https://react.dev/) application that is bundled using [Webpack](https://webpack.js.org/). The bundle is served by the backend as a static file.
   * The `package.json` file is at the root of this repo.

* A [Fastly Compute](https://docs.fastly.com/products/compute-at-edge) application. The purpose of this program is to hand off applicable incoming requests at the edge to [Fastly Fanout](https://docs.fastly.com/products/fanout).
   * The `package.json` file is in the `edge/` directory of this repo.

The live instance's backend runs on an instance of Google App Engine.

The live instance's edge application is at [leaderboard-demo.edgecompute.app](https://leaderboard-demo.edgecompute.app/). It is configured with the above backend application as the backend, and the service has the [Fanout feature enabled](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#enable-fanout).

For more details, see the [Architecture](#architecture) section below.

## Usage

### Development

This application can be run locally without needing to create a Fastly account or enable the Fanout feature. 

To run this application locally, you will need to run both the backend application (on Node.js) and the edge application (in Fastly's local development server).

You will need the following on your development environment:

* [Node.js](https://nodejs.dev/) 18.x or newer
* [Fastly CLI](https://www.fastly.com/documentation/reference/tools/cli/) version 11.5.0 or newer
* [Viceroy](https://github.com/fastly/Viceroy) version 0.14.0 or newer (usually managed by Fastly CLI)
* [a local installation](https://pushpin.org/docs/install/) of Pushpin

#### Run the backend application

1. Clone this repository to a new directory on your development environment.

2. Install JavaScript dependencies for this project.

   ```
   npm install
   ```

3. Start the application:

   ```
   npm run dev
   ```

This will start two processes:
* one to use Webpack to build the client application, and
* another to run the server application. Changes to source files will be monitored and the application will be rebuilt as necessary.

The backend application will run at http://localhost:3000/.

#### Run the edge application

The files live in the `edge/` directory of this repo.

1. Switch to the `edge` directory and install JavaScript dependencies.

   ```
   cd edge
   npm install
   ```

2. Start the application:

   ```
   npm run dev
   ```

Now, browse to your application at http://localhost:7676/.

### Production

To run in production, you will need a [Fastly Compute service with Fanout enabled](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#enable-fanout).

You will also need to run the backend application on an origin server that is visible from the internet.

#### Deploy the backend application

Use a Node.js server that is visible from the internet.

1. Clone this repository to a new directory on your Node.js server.

2. Switch to the directory and install dependencies:

    ```
    npm install
    ```

3. Copy `.env.template` to `.env`, and modify it to set the following environment variables:
    * `GRIP_URL`: `https://api.fastly.com/service/<service-id>?verify-iss=fastly:<service-id>&key=<api-token>`

        Replace `<service-id>` with your Fastly service ID, and `<api-token>`
        with an API token for your service that has `global` scope.(\*)

        (*) It's likely that your Fastly service ID is not determined yet, as you have not yet deployed the edge application. If this is the case, leave this blank for now and set it up after you have deployed your edge application.

    * `GRIP_VERIFY_KEY`: `base64:LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFQ0tvNUExZWJ5RmNubVZWOFNFNU9uKzhHODFKeQpCalN2Y3J4NFZMZXRXQ2p1REFtcHBUbzN4TS96ejc2M0NPVENnSGZwLzZsUGRDeVlqanFjK0dNN3N3PT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t`(\*)

        (*) This is a base64-encoded version of the public key published at [Validating GRIP requests](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#validating-grip-requests) on the Fastly Developer Hub.

    * `PORT`: (if necessary) `80` or an appropriate port to run the backend server.

4. Start your application:

    ```
    npm run start
    ```

#### Deploy the edge application

The files live in the `edge/` directory of this repo.

1. Switch to the `edge` directory and install JavaScript dependencies.

   ```
   cd edge
   npm install
   ```

2. Deploy the application:

   ```
   npm run deploy
   ```

3. The first time you deploy this application, the Fastly CLI will prompt you for a service ID or offer to create a new one. Follow the on-screen prompts to set up the service. You will also be prompted to set up backends. Use the name `origin` and set it up to point to the public domain name of your backend application.

4. You also need to [enable Fanout](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#enable-fanout) on your service.

   ```term
   $ fastly products --enable=fanout
   ```

5. Now that your service ID has been determined, return to your backend and update the GRIP_URL environment variable with the service ID. Restart the backend application. 

6. Browse to the public domain name of your Compute service.

### Configuration

The backend application is configured using three environment variables:

* `GRIP_URL` - a URL used to publish messages through a GRIP proxy. The default value is `http://127.0.0.1:5561/`, a value that can be used in development to publish to Pushpin.
* `GRIP_VERIFY_KEY` - (optional) a string that can be used to configure the `verify-key` component of `GRIP_URL`. See [Configuration of js-serve-grip](https://github.com/fanout/js-serve-grip#configuration) for details.
* `PORT` - (optional) the port to listen on. the default value is `3000`.

## Architecture

### Real-time Updates

The `/boards/:boardId/` endpoint of the backend application checks the `Accept` header of an incoming request for `text/event-stream`, and conditionally serves a stream of updates in real time, over [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). This works by using [Fastly Fanout](https://docs.fastly.com/products/fanout), a [GRIP (Generic Realtime Intermediary Protocol)](https://pushpin.org/docs/protocols/grip/) proxy implementation. Responses for streaming requests are held open by Fanout. Then, as updates become ready, the backend application publishes these updates through Fanout to all connected clients.

Additionally, the [ServeGrip](https://github.com/fanout/js-serve-grip) middleware library for Express makes it easy to work with GRIP.

1.  As the backend application starts, `ServeGrip` is instantiated as a singleton with information about the GRIP proxy being used, and is stored as the global variable `serveGrip`.

2.  In `api.js`, the `/boards/:boardId/` API handler checks for the `Accept` header value of `text/event-stream`. If it is found, then the `req.grip` object is checked for `isProxied`, `needsSigned`, and `isSigned` values to check that it the request came from a valid GRIP proxy.

    If so, then the handler uses `res.grip.startInstruct()` to issue a GRIP instruction to hold the response stream open, and to associate the response with the channel ID `board-{id}`.

3.  Each time the SQLite database updates an object, an event handler (`SQLite.instance.onDbUpdated()` in `index.js`) executes. If the updated object is a `Board`, then an SSE event is built and published over GRIP. The publisher is exposed by the `serveGrip.getPublisher()` function.

For more details, see [Realtime messaging with Fanout](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/) on Fastly's Developer Hub, the [GRIP documentation](https://pushpin.org/docs/protocols/grip/), and [fanout/js-serve-grip](https://github.com/fanout/js-serve-grip) on GitHub.

### Server

The server application is written in JavaScript, for [Node.js](https://nodejs.dev/). It uses [Express](https://expressjs.com) for the web framework with a small amount of [Nunjucks](https://mozilla.github.io/nunjucks/) templating. It stores data to a small database in [SQLite](https://www.sqlite.org/). It can be run in any Node.js environment.

This program exposes some APIs ([api.js](server/api.js)) that gives access to:
* Information about a leaderboard and its players (\*)
* Information about a single player
* A method to increment the score of a player

(\*) By using [GRIP](https://pushpin.org/docs/protocols/grip/), this endpoint also provides updates to player information in real time, over [SSE (Server-Sent Events)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). See [Real-time updates](#real-time-updates) above for more details.

It also serves the index route, served by the `/` handler in `index.js`, serves an HTML page that loads the [Client](#client) application, setting up the Leaderboard component with an initial list of players. The page then signs up to real-time updates, by subscribing to the Server-Sent Events endpoint described above.

Finally, the application also serves some public files, including the browser bundle for the client application.

It has the following structure:

```
server/
  db/
    models/      - Contains the models and initialization for the DB
    SQLite.js    - A utility class that gives access to the DB connection
                   as well as emit update events
  public/        - Contains static public files to be served by the Express server
  views/         - Nunjucks templates for web views
  api.js         - API routes for routes under /boards/
  index.js       - Entry point, sets up the various components.
```

### Client

The client application is written in JavaScript, using [React](https://react.dev) and [CSS Modules](https://github.com/css-modules/css-modules). It is packaged into a browser bundle using [Webpack](https://webpack.js.org), and is placed in the `/server/public/client` directory to be served by the server application.

This program has the following structure:

```
client/
  components/          - React components to render a Leaderboard and player info
  styles/              - Global styles for the React app
  ActionsContext.js    - Context object to hold actions
  index.js             - entry point
```

The entry point of this program exposes a function `startLeaderboardApp()`.

This function takes an object as its argument:
```
rootElement - The DOM node under which to instantiate the Leaderboard component.
onIncrement - A callback function that is called whenever the '+1' button next to a
              player is tapped. The function is called with the player ID as its argument.
players     - An array of players in the format returned by the Player.getTopForBoard(board) function.              
```

The function returns an object to the caller:
```
setPlayers  - A function that can be called to cause the Leaderboard component to re-render.
              It takes an updated array of players as its argument.
```

The server application's index template uses this mechanism to set up the Leaderboard component with an initial list of players and to sign up to real-time updates.

## Issues

If you encounter any non-security-related bug or unexpected behavior, please [file an issue][bug] using the bug report template.

[bug]: https://github.com/fastly/fanout-leaderboard-demo/issues/new?labels=bug

### Security issues

Please see our [SECURITY.md](SECURITY.md) for guidance on reporting security-related issues.

## License

[MIT](LICENSE.md).
