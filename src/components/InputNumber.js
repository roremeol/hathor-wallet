/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useLayoutEffect, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import hathorLib from "@hathor/wallet-lib";

/**
 * Component that enhances typing numbers
 *
 * @memberof Components
 * @component
 * @constructor
 * @example
 * const onValueChange = (value) => {
 *  alert(value);
 * }
 * return (
 *   <InputNumber onValueChange={onValueChange} />
 * )
 */
const InputNumber = React.forwardRef(
  (
    {
      defaultValue,
      precision,
      separator,
      locale,
      onValueChange,
      ...otherProps
    },
    ref
  ) => {
    /**
     * Formats a string following the pattern 9,999.99. It decomposes rawValue into decimal and fractional parts, mainly to add the thousands separator.
     *
     * @param {string} rawValue String to be formatted
     *
     * @return {string} Formatted string
     */
    const format = (rawValue = "") => {
      const value = String(rawValue)
        .replace(/[^\d]/g, "")
        .padStart(precision + 1, "0");
      const decimalPart = Intl.NumberFormat(locale).format(
        value.substr(0, value.length - precision)
      );
      const fractionalPart = value.substr(value.length - precision);
      if (fractionalPart.length === 0) {
        return decimalPart;
      } else {
        return `${decimalPart}${separator}${fractionalPart}`;
      }
    };

    const innerRef = ref || useRef();
    const [value, setValue] = useState(format(defaultValue));

    /**
     * Listen keydown events while this component is focused overriding the default native input behavior.
     * Only digits and backspace are allowed.
     *
     * @param  {KeyboardEvent} evt Event carrying the keyboard key
     */
    const onKeyDown = (evt) =>
      setValue((value) => {
        const isNumberChar = /\d/.test(evt.key);
        const isBackspace = evt.key === "Backspace" || evt.key === "Delete";
        const isDeleteAll =
          isBackspace &&
          evt.target.selectionEnd - evt.target.selectionStart >= value.length;
        const isCtrlOrMeta = evt.ctrlKey || evt.metaKey;

        // Do not handle keyboard events when ctrlKey or metaKey are present
        if (isCtrlOrMeta) {
          return value;
        }

        let newValue = value;
        if (isDeleteAll) {
          newValue = "";
        } else if (isNumberChar) {
          newValue = value.concat(evt.key);
        } else if (isBackspace) {
          newValue = value.slice(0, -1);
        }
        newValue = format(newValue);
        updateCaretPosition(newValue);
        return newValue;
      });

    /**
     * Handle onClick events just to update the caret position.
     *
     * @param  {MouseEvent} evt MouseEvent triggered when the input or its inner content is clicked
     */
    const onClick = (evt) => {
      updateCaretPosition(format(evt.target.value));
    };

    /**
     * Put the caret always at the end.
     *
     * @param  {string} value Current input value
     */
    const updateCaretPosition = (value) => {
      setTimeout(() => {
        const { current } = innerRef;
        if (current) {
          current.selectionStart = value.length;
        }
      });
    };

    /**
     * Listen paste events as the default behavior of inputs is overrided.
     *
     * @param  {ClipboardEvent} evt Event carrying a paste text
     *
     * @method InputNumber#onPaste
     */
    const onPaste = (evt) =>
      setValue(() => {
        const paste = format(
          (evt.clipboardData || window.clipboardData).getData("text")
        );
        updateCaretPosition(paste);
        return paste;
      });

    /**
     * Set listeners to keydown and to paste events.
     */
    useLayoutEffect(() => {
      const { current } = innerRef;
      if (current) {
        current.addEventListener("keydown", onKeyDown);
        current.addEventListener("paste", onPaste);
        current.addEventListener("click", onClick);
        return () => {
          current.removeEventListener("keydown", onKeyDown);
          current.removeEventListener("paste", onPaste);
          current.removeEventListener("click", onClick);
        };
      }
    }, []);

    /**
     * Call onValueChange every time the value changes, similarly the native onChange callback.
     */
    useEffect(() => {
      const parsedValue =
        Number(value.replace(/[^\d]/g, "")) / Math.pow(10, precision);
      onValueChange(parsedValue);
    }, [value]);

    return <input ref={innerRef} value={value} {...otherProps} type="text" />;
  }
);

InputNumber.propTypes = {
  /**
   * Same behavior of React input defaultValue
   */
  defaultValue: PropTypes.string,
  /**
   * Number of digits after the separator
   */
  precision: PropTypes.number,
  /**
   * Generally a dot or a comma char
   */
  separator: PropTypes.string,
  /**
   * Locale (e.g.: 'en-US', 'pt-br'). Must be used in conjunction with `separator`
   */
  locale: PropTypes.string,
  /**
   * Similar to onChange, but it receives the parsed value as single parameter
   */
  onValueChange: PropTypes.func,
  /**
   * Same behavior of React input onChange
   */
  onChange: PropTypes.func,
};

InputNumber.defaultProps = {
  defaultValue: "",
  precision: hathorLib.constants.DECIMAL_PLACES,
  separator: ".",
  locale: "en-US",
  onValueChange: () => {},
  onChange: () => {},
};

export default InputNumber;
