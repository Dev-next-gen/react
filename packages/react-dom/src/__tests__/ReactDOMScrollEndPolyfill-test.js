/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// jsdom implements `onscrollend`, so without this the feature detection in
// ScrollEndEventPlugin takes the native path and the polyfill never runs.
jest.mock('react-dom-bindings/src/events/isEventSupported');

describe('onScrollEnd polyfill', () => {
  let React;
  let ReactDOMClient;
  let act;
  let container;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ({act} = require('internal-test-utils'));

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  // @gate enableScrollEndPolyfill
  it('does not emulate bubbling when the polyfill fires onScrollEnd', async () => {
    const ref = React.createRef();
    const log = [];
    const onScrollEnd = e =>
      log.push(['onScrollEnd', 'bubble', e.currentTarget.className]);
    const onScrollEndCapture = e =>
      log.push(['onScrollEnd', 'capture', e.currentTarget.className]);

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div
          className="grand"
          onScrollEnd={onScrollEnd}
          onScrollEndCapture={onScrollEndCapture}>
          <div
            className="parent"
            onScrollEnd={onScrollEnd}
            onScrollEndCapture={onScrollEndCapture}>
            <div
              className="child"
              onScrollEnd={onScrollEnd}
              onScrollEndCapture={onScrollEndCapture}
              ref={ref}
            />
          </div>
        </div>,
      );
    });

    // No native 'scrollend' follows this scroll, so onScrollEnd comes from the
    // debounced polyfill. `act` flushes its pending timer.
    await act(() => {
      ref.current.dispatchEvent(
        new Event('scroll', {
          bubbles: false,
        }),
      );
    });

    // The same listeners a native 'scrollend' dispatches to.
    expect(log).toEqual([
      ['onScrollEnd', 'capture', 'grand'],
      ['onScrollEnd', 'capture', 'parent'],
      ['onScrollEnd', 'capture', 'child'],
      ['onScrollEnd', 'bubble', 'child'],
    ]);
  });
});
