/**
 * NodeRED Google SmartHome
 * Copyright (C) 2018 Michael Jacobsen.
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
 **/

"use strict";

const Formats = {
    BOOL: 1,
    INT: 2,
    FLOAT: 3,
    STRING: 4
};

module.exports.Formats = Formats;

/******************************************************************************************************************
 *
 *
 */
module.exports.FormatValue = function(format, key, value) {
    if (typeof value === 'string') {
        switch(format) {
            case Formats.BOOL:
                let t = value.toUpperCase()

                if (t == "TRUE" || t == "ON" || t == "YES" || t == "1") {
                    return true;
                } else if (t == "FALSE" || t == "OFF" || t == "NO" || t == "0") {
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

            default:
                let val = parseInt(value)

                if (isNaN(val)) {
                    throw new Error('Type of ' + key + ' is string but it cannot be converted to a integer');
                }

                return val;
        }
    } else if (typeof value === 'number') {
        switch(format) {
            case Formats.BOOL:
                let val = (value > 0)
                return val;

            case Formats.STRING:
                return value.toString();

            default:
                return value;
        }
    } else if (typeof value === 'boolean') {
        switch(format) {
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
        if (value.hasOwnProperty(key)) {
            return FormatValue(format, key, value[key]);
        } else {
            throw new Error('Type of ' + key + ' is object but it does not have matching property');
        }
    } else {
        throw new Error('Type of ' + key + ' is not compatible; typeof = ' + typeof value);
    }
}

/******************************************************************************************************************
 *
 *
 */
module.exports.FormatBrightness = function(value) {
    if (value < 0) {
        return 0;
    } else if (value > 100) {
        return 100;
    }

    return value;
}

module.exports.FormatHue = function(value) {
    if (value < 0) {
        return 0.0;
    } else if (value > 360) {
        return 360.0;
    }

    return value;
}

module.exports.FormatSaturation = function(value) {
    if (value < 0) {
        return 0.0;
    } else if (value > 100) {
        return 100.0;
    }

    return value;
}

module.exports.FormatRGB = function(value) {
    if (value < 0) {
        return 0;
    } else if (value > 16777215) {
        return 16777215;
    }

    return value;
}
