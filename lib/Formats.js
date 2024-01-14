/**
 * node-red-contrib-google-smarthome
 * Copyright (C) The node-red-contrib-google-smarthome Contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

/******************************************************************************************************************
 * Helper functions to convert input values to target formats.
 *
 */
const Formats = {
    BOOL: 1,
    INT: 2,
    FLOAT: 4,
    STRING: 8,
    DATETIME: 16,
    PRIMITIVE: 31,
    OBJECT: 32,
    ARRAY: 64,
    MANDATORY: 128,
    COPY_OBJECT: 256,
    DELETE_MISSING: 512,


    /**
     * Convert an input value (e.g. "on"/"off") to a target type (e.g. BOOL).
     *
     * @param {string} key - Key to use in error messages
     * @param {*} value - Input value to convert
     * @param {number} format - Target type to convert to (e.g. Fromats.BOOL, Formats.STRING)
     * @param {*} default_value - Target value to use if input is undefined
     * @returns {*}
     */
    formatValue(key, value, format, default_value = undefined) {
        if (typeof value === 'undefined') {
            value = default_value;
        }

        if (typeof value === 'string') {
            switch (format) {
                case Formats.BOOL:
                    if(!isNaN(parseFloat(value)))
                        return this.formatValue(key, parseFloat(value), format, default_value);

                    let t = value.toUpperCase();

                    if (t === "TRUE" || t === "ON" || t === "YES" || t === "1") {
                        return true;
                    } else if (t === "FALSE" || t === "OFF" || t === "NO" || t === "0") {
                        return false;
                    } else {
                        throw new Error('Type of ' + key + ' is string but it cannot be converted to a boolean');
                    }

                case Formats.STRING:
                    return value;

                case Formats.FLOAT:
                    let fval = parseFloat(value);

                    if (isNaN(fval)) {
                        throw new Error('Type of ' + key + ' is string but it cannot be converted to a float');
                    }

                    return fval;

                case Formats.DATETIME:
                    return value;

                default:
                    // Allow hex values (#00FF33) by converting them to valid JS values (0x00FF33)
                    if(value.startsWith('#')) {
                        value = value.replace('#', '0x');
                    }

                    let val = parseInt(value);

                    if (isNaN(val)) {
                        throw new Error('Type of ' + key + ' is string but it cannot be converted to a integer');
                    }

                    return val;
            }
        } else if (typeof value === 'number') {
            switch (format) {
                case Formats.BOOL:
                    return (value != 0);

                case Formats.STRING:
                    return value.toString();

                case Formats.INT:
                    return parseInt(value);

                case Formats.DATETIME:
                    let dval = new Date(value);
                    return dval.toISOString();

                default:
                    return value;
            }
        } else if (typeof value === 'boolean') {
            switch (format) {
                case Formats.BOOL:
                    return value;

                case Formats.STRING:
                    if (value) {
                        return "true";
                    } else {
                        return "false";
                    }

                default:
                    if (value) {
                        return 1;
                    } else {
                        return 0;
                    }
            }
        } else if (typeof value === 'object') {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                return this.formatValue(format, key, value[key]);
            } else {
                throw new Error('Type of ' + key + ' is object but it does not have matching property');
            }
        } else {
            throw new Error('Type of ' + key + ' is not compatible; typeof = ' + typeof value + "; value = " + JSON.stringify(value));
        }
    }
};

module.exports = Formats;
