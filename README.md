# Leaderboard Demo for Fastly Fanout

This application demonstrates the use of [Fastly Fanout](https://docs.fastly.com/products/fanout)
to maintain a leaderboard and update it across devices in real time.

A live instance of this demo can be found at [leaderboard-demo.edgecompute.app](https://leaderboard-demo.edgecompute.app/).

## Overview

To enable realtime updates, [Fastly Fanout](https://docs.fastly.com/products/fanout) is positioned as a
[GRIP (Generic Realtime Intermediary Protocol)](https://pushpin.org/docs/protocols/grip/) proxy. Responses for streaming
requests are held open by Fanout. Then, as updates become ready, the backend application publishes these updates through
Fanout to all connected clients. For details on this mechanism, see [Real-time Updates](#real-time-updates) below.

The project comprises two main parts:

* A web application. The backend for this web application is written in JavaScript, for [Node.js](https://nodejs.dev/). 
  It uses the [Express](https://expressjs.com/) web framework and uses [SQLite](https://www.sqlite.org/) to maintain a
  small database. The frontend for this web application is a [React](https://react.dev/) application that is bundled
  using [Webpack](https://webpack.js.org/). The bundle is served by the backend as a static file.

* An edge application. A [Fastly Compute](https://docs.fastly.com/products/compute-at-edge)
  application that passes traffic through to the web application, and activates the
  [Fanout feature](https://docs.fastly.com/products/fanout) for relevant requests.

The live instance's backend runs on [Glitch](https://glitch.com/), and the project can be viewed here:
[https://glitch.com/~fanout-leaderboard-demo](https://glitch.com/~fanout-leaderboard-demo).

The live instance's edge application is at [leaderboard-demo.edgecompute.app](https://leaderboard-demo.edgecompute.app/).
It is configured with the above Glitch application as the backend, and the service has the
[Fanout feature enabled](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#enable-fanout).

For more details, see the [Architecture](#architecture) section below.

## Usage

### Development

Though the project is designed with Glitch and Fastly in mind, it's possible to run
it locally for development.

You will need:

* [Node.js](https://nodejs.dev/) 16.x or newer
* [Pushpin](https://pushpin.org/) - This open source GRIP proxy implementation can take the place of Fanout during
    development.

Preparation:

1. [Install Pushpin](https://pushpin.org/docs/install/).

2. Configure Pushpin using `localhost:3000` by modifying the `routes` file.
    For example, on a default macOS installation, set the contents of `/opt/homebrew/etc/pushpin/routes`:

    ```
    * localhost:3000
    ```

3. Install Node.js dependencies for this project.

    ```
    npm install
    ```
   
    > NOTE: If you are using a version of Node.js newer than 16.x, you may see a warning during this step
    > indicating that the version of Node.js is incompatible. This happens because this project is marked
    > for Node.js 16.x, but this warning can safely be ignored. 

To start the application:

```
npm run dev
```

This will start two processes: one to use Webpack to build the client application; and another to run the server
application. Changes to source files will be monitored and the application will be rebuilt as necessary.

Now, browse to your application at http://localhost:7999/.

### Production

To run in production, you will need a [Fastly Compute service with Fanout enabled](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#enable-fanout).

You will also need to run the server application on an origin server that is visible from the internet.

#### Running on Glitch

This application is written with Glitch in mind.

> NOTE: If you are using Glitch, consider [boosting your app](https://glitch.happyfox.com/kb/article/73-glitch-pro/) so
> that it doesn't go to sleep.

1. Create a new project on [Glitch](https://glitch.com/) and import this GitHub repository. Note the public URL of your project, which
    typically has the domain name `https://<project-name>.glitch.me`.

2. Set up the environment. In the Glitch interface, modify `.env` and set the following values:
    * `GRIP_URL`: `https://api.fastly.com/service/<service-id>?verify-iss=fastly:<service-id>&key=<api-token>`

        Replace `<service-id>` with your Fastly service ID, and `<api-token>`
        with an API token for your service that has `global` scope.

    * `GRIP_VERIFY_KEY`: `base64:LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFQ0tvNUExZWJ5RmNubVZWOFNFNU9uKzhHODFKeQpCalN2Y3J4NFZMZXRXQ2p1REFtcHBUbzN4TS96ejc2M0NPVENnSGZwLzZsUGRDeVlqanFjK0dNN3N3PT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t`(\*)   

        (*) This is a base64-encoded version of the public key published at [Validating GRIP requests](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#validating-grip-requests) on the Fastly Developer Hub.
    
3. Glitch will automatically start your app by running `npm install` and `npm run start`.

4. Set up the [edge application](edge) on your Fastly account, and set your Glitch application as a backend for it
    using the name `origin`. See the edge application's [README.md](edge/README.md) file for details.

5. Browse to your application at the public URL of your Edge application.

#### Running on your own Node.js server

This application is written with Glitch in mind, but you can alternatively use any Node.js server that is visible from
the internet. 

1. Clone this repository to a new directory on your Node.js server.

2. Switch to the directory and install dependencies:

    ```
    npm install
    ```

3. Set the following environment variables:
    * `GRIP_URL`: `https://api.fastly.com/service/<service-id>?verify-iss=fastly:<service-id>&key=<api-token>`

        Replace `<service-id>` with your Fastly service ID, and `<api-token>`
        with an API token for your service that has `global` scope.

    * `GRIP_VERIFY_KEY`: `base64:LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFQ0tvNUExZWJ5RmNubVZWOFNFNU9uKzhHODFKeQpCalN2Y3J4NFZMZXRXQ2p1REFtcHBUbzN4TS96ejc2M0NPVENnSGZwLzZsUGRDeVlqanFjK0dNN3N3PT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t`(\*)

        (*) This is a base64-encoded version of the public key published at [Validating GRIP requests](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#validating-grip-requests) on the Fastly Developer Hub.

4. Start your application:

    ```
    npm run start
    ```

5. Set up the [edge application](edge) on your Fastly account, and set your Node.js application as a backend for it using
   the name `origin`. See the edge application's [README.md](edge/README.md) file for details.

6. Browse to your application at the public URL of your Edge application.

#### Production on your own Pushpin instance (advanced)

It's also possible to run in production using your own instance of Pushpin. The details are beyond the scope of this
document, but here are some pointers:

* Configure Pushpin to proxy to your instance of the server application
* Then set your `GRIP_URL` to point to your Pushpin instance

For more details, see [Pushpin Configuration](https://pushpin.org/docs/configuration/).

### Configuration

This program can be configured using two environment variables:

* `GRIP_URL` - a URL used to publish messages through a GRIP proxy. The default value
  is `http://127.0.0.1:5561/`, a value that can be used in development to publish to Pushpin.
* `GRIP_VERIFY_KEY` - (optional) a string that can be used to configure the `verify-key` component
  of `GRIP_URL`. See [Configuration of js-serve-grip](https://github.com/fanout/js-serve-grip#configuration)
  for details.

## Architecture

### Real-time Updates

The `/boards/:boardId/` endpoint of the backend application checks the `Accept` header of an incoming
request for `text/event-stream`, and conditionally serves a stream of updates in real time, over
[Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).
This works by using [Fastly Fanout](https://docs.fastly.com/products/fanout), a [GRIP (Generic Realtime Intermediary
Protocol)](https://pushpin.org/docs/protocols/grip/) proxy implementation. Responses for streaming requests are held
open by Fanout. Then, as updates become ready, the backend application publishes these updates through Fanout to all
connected clients.

Additionally, the [ServeGrip](https://github.com/fanout/js-serve-grip) middleware library for Express makes it easy to
work with GRIP.

1.  As the backend application starts, `ServeGrip` is instantiated as a singleton with information about the
    GRIP proxy being used, and is stored as the global variable `serveGrip`.

2.  In `api.js`, the `/boards/:boardId/` API handler checks for the `Accept` header value of `text/event-stream`. If it is
    found, then the `req.grip` object is checked for `isProxied`, `needsSigned`, and `isSigned` values to check that it the
    request came from a valid GRIP proxy.

    If so, then the handler uses `res.grip.startInstruct()` to issue a GRIP instruction to hold the response stream open,
    and to associate the response with the channel ID `board-{id}`.

3.  Each time the SQLite database updates an object, an event handler (`SQLite.instance.onDbUpdated()` in
    `index.js`) executes. If the updated object is a `Board`, then an SSE event is built and published over GRIP.
    The publisher is exposed by the `serveGrip.getPublisher()` function.

For more details, see [Realtime messaging with Fanout](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/)
on Fastly's Developer Hub, the [GRIP documentation](https://pushpin.org/docs/protocols/grip/), and
[fanout/js-serve-grip](https://github.com/fanout/js-serve-grip) on GitHub.

### Server

The server application is written in JavaScript, for [Node.js](https://nodejs.dev/). It uses
[Express](https://expressjs.com) for the web framework with a small amount of
[Nunjucks](https://mozilla.github.io/nunjucks/) templating. It stores data to a small database in
[SQLite](https://www.sqlite.org/). It is designed to be run in [Glitch](https://glitch.com/), but it can be run in any
Node.js environment.

> NOTE: Because it is designed to run in Glitch, it is marked as a Node.js 16.x program, as that is the newest version
> of Node.js supported by Glitch at the time of this writing.

This program exposes some APIs ([api.js](server/api.js)) that gives access to:
* Information about a leaderboard and its players (\*)
* Information about a single player
* A method to increment the score of a player

(\*) By using [GRIP](https://pushpin.org/docs/protocols/grip/), this endpoint also provides updates to player
information in real time, over [SSE (Server-Sent Events)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).
See [Real-time updates](#real-time-updates) above for more details.

It also serves the index route, served by the `/` handler in `index.js`, serves an HTML page that loads the
[Client](client) application, setting up the Leaderboard component with an initial list of players. The page then signs
up to real-time updates, by subscribing to the Server-Sent Events endpoint described above.

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

The client application is written in JavaScript, using [React](https://react.dev) and
[CSS Modules](https://github.com/css-modules/css-modules). It is packaged into a browser bundle using
[Webpack](https://webpack.js.org), and is placed in the `/server/public/client` directory to be served by the server
application.

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

The server application's index template uses this mechanism to set up the Leaderboard component with an initial list
of players and to sign up to real-time updates.

## Issues

If you encounter any non-security-related bug or unexpected behavior, please [file an issue][bug]
using the bug report template.

[bug]: https://github.com/fastly/fanout-leaderboard-demo/issues/new?labels=bug

### Security issues

Please see our [SECURITY.md](SECURITY.md) for guidance on reporting security-related issues.

## License

[MIT](LICENSE.md).
