/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2025 Claudio Chimera and others.
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

import assert from 'assert';
import { describe, it } from 'mocha';
import { Formats } from '../lib/Formats';

/**
 * Format a value for output.
 *
 * @param {mixed} value - The value to be formatted
 * @returns {*|string} - The formatted value
 */
function outputValue(value)
{
    if(typeof value === 'string')
        return '"' + value + '"';
    else
        return value;
}

/**
 * Tests if all the values specified in `inputValues` can be successfully converted to the value specified by
 * `targetValue` and the type specified by `targetType`.
 *
 * @param {mixed[]} inputValues - The values to be tested for conversion
 * @param {number} targetType - The target type to which the values will be converted
 * @param {mixed} targetValue - The expected result of the conversion for each input value
 * @param {string} targetDescription - Description of the target value for log output
 */
function testConvertsToValue(inputValues, targetType, targetValue, targetDescription)
{
    inputValues.forEach((value) => {
        it(`${outputValue(value)} converts to ${targetDescription}`, function () {
            this.timeout(1000);

            let result = Formats.formatValue('value', value, targetType);
            assert.strictEqual(result, targetValue);
        });
    });
}

/**
 * Tests if trying to convert a list of values to a specific type results in an error being thrown.
 *
 * @param {mixed[]} inputValues - The values to be tested for conversion
 * @param {number} targetType - The target type to which the values will be converted
 * @param {string} targetDescription - Description of the target value for log output
 */
function testForError(inputValues, targetType, targetDescription)
{
    inputValues.forEach((value) => {
        it(`${outputValue(value)} throws error when converted to ${targetDescription}`, function () {
            this.timeout(1000);

            assert.throws(() => {
                Formats.formatValue('value', value, targetType)
            });
        });
    });
}

// ----------------------------------------------------------------------------------------

describe('Format Conversion', function () {
    it(`default value is returned for undefined`, function () {
        this.timeout(1000);

        let result = Formats.formatValue('value', undefined, Formats.STRING, 'default value for test');
        assert.strictEqual(result, 'default value for test');
    });


    let convertToTrue = [
        true,
        'true',
        'on',
        'yes',
        1,
        '1',
        2,
        '2',
    ];
    testConvertsToValue(convertToTrue, Formats.BOOL, true, 'boolean true');


    let convertToFalse = [
        false,
        'false',
        'off',
        'no',
        0,
        '0',
    ];
    testConvertsToValue(convertToFalse, Formats.BOOL, false, 'boolean false');


    let convertToString10 = [
        10,
        '10',
    ];
    testConvertsToValue(convertToString10, Formats.STRING, '10', 'string "10"');


    let convertToFloat10point5 = [
        10.5,
        '10.5',
    ];
    testConvertsToValue(convertToFloat10point5, Formats.FLOAT, 10.5, 'float 10.5');


    let convertToInt10 = [
        10,
        '10',
        10.5,
        '10.5',
        '0x00000A',
        '#00000A',
    ];
    testConvertsToValue(convertToInt10, Formats.INT, 10, 'int 10');

    let convertToStringTrue = [
        true,
        'true',
    ];
    testConvertsToValue(convertToStringTrue, Formats.STRING, 'true', 'string true');

    let convertToStringFalse = [
        false,
        'false',
    ];
    testConvertsToValue(convertToStringFalse, Formats.STRING, 'false', 'string false');


    let errorWhenConvertedToBool = [
        undefined,
        'somevalue',
    ];
    testForError(errorWhenConvertedToBool, Formats.BOOL, 'bool');


    let errorWhenConvertedToFloat = [
        undefined,
        'somevalue',
    ];
    testForError(errorWhenConvertedToFloat, Formats.FLOAT, 'float');
});
