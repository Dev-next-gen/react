/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

let React;
let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let serverAct;
let turbopackMap;

const serverConsumerManifest = {moduleMap: null, moduleLoading: null};

// Credit through reuse. Flight serializes a shared element, object, promise
// or `React.cache` entry once and refers to it from every later position.
// The writes made producing it are credited to every capture that reuses
// it, wherever the first position was.
describe('ReactFlightTurbopackLedgersSharing', () => {
  beforeEach(() => {
    jest.resetModules();
    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      jest.requireActual('react-server-dom-turbopack/server.node'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-turbopack/server');
    turbopackMap = require('./utils/TurbopackMock').turbopackMap;

    jest.resetModules();
    __unmockReact();
    React = require('react');
    jest.unmock('react-server-dom-turbopack/server');
    jest.mock('react-server-dom-turbopack/client', () =>
      jest.requireActual('react-server-dom-turbopack/client.node'),
    );
    ReactServerDOMClient = require('react-server-dom-turbopack/client');
  });

  async function render(model) {
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(model, turbopackMap),
    );
    return await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
  }

  // A header rendered by the layout, outside every capture, and reused by a
  // segment: the segment's capture is credited the header's write.
  // @gate enableFlightLedgers
  it('attributes an element rendered outside every capture to a capture that reuses it', async () => {
    const Mask = ReactServer.createMaskLedger();
    const FROM_HEADER = 0b1;
    let renders = 0;

    function Header() {
      renders++;
      ReactServer.addToLedger(Mask, FROM_HEADER);
      return 'header';
    }

    const header = <Header />;

    function Segment() {
      return {header};
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Segment />, [Mask]);
      return {header, segment: captured.data, mask: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(renders).toBe(1);
    expect(await result.mask).toBe(FROM_HEADER);
  });
});
