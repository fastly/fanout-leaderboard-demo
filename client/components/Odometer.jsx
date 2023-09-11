/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import React, { useCallback, useEffect, useState } from 'react';
import OdometerModule from 'odometer';

import '../styles/odometer-theme-default.css';

// "SafeOdometer" wraps the Odometer module so that values are only increasing.
// It also buffers increments so that another update can be performed while
// the current one is still animating.
class SafeOdometer {

  odometer;
  odometerTargetValue;

  constructor(opts) {
    this.odometer = new OdometerModule(opts);

    // -1 means the odometer is not currently moving.
    this.odometerTargetValue = -1;

    this.odometer.el.addEventListener('odometerdone', () => {
      // Get the target value
      const targetValue = this.odometerTargetValue;

      // Set the target value to -1, indicating that the odometer is no
      // longer moving.
      this.odometerTargetValue = -1;

      // If the target value has moved since the odometer finished,
      // move it again to the new target.
      if (targetValue !== this.odometer.value) {
        this.update(targetValue);
      }
    });
  }

  update(value) {
    // Odometer is currently moving if target value is not -1
    // In that case don't call update, just update the target value.
    if (this.odometerTargetValue !== -1) {
      // Only increment. Target value should never fall.
      if (value > this.odometerTargetValue) {
        this.odometerTargetValue = value;
      }
      return;
    }

    // Only increment. Value should never fall.
    if (value > this.odometer.value) {
      this.odometerTargetValue = value;
      this.odometer.update(value);
    }
  }
}

export default function Odometer(props) {

  const { className, value } = props;

  const [ odometer, setOdometer ] = useState(null)

  const oRef = useCallback((node) => {
    if (node != null) {
      const odometer = new SafeOdometer({
        el: node,
        value,
      });
      setOdometer(odometer);
    }
  }, []);

  useEffect(() => {
    if (odometer != null) {
      odometer.update(value);
    }
  }, [ odometer, value ]);

  return (
    <div className={className} ref={oRef} />
  );
}
