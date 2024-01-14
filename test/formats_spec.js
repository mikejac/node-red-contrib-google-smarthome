/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2024 Claudio Chimera and others.
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

/* eslint-env mocha */

const assert = require('assert');
const formats = require('../lib/Formats');

function outputValue(value)
{
    if(typeof value === 'string')
        return '"' + value + '"';
    else
        return value;
}

function testConvertsToValue(inputValues, targetType, targetValue, targetDescription)
{
    inputValues.forEach((value) => {
        it(`${outputValue(value)} converts to ${targetDescription}`, function () {
            this.timeout(1000);

            let result = formats.formatValue('value', value, targetType);
            assert.strictEqual(result, targetValue);
        });
    });
}
function testForError(inputValues, targetType, targetDescription)
{
    inputValues.forEach((value) => {
        it(`${outputValue(value)} throws error when converted to ${targetDescription}`, function () {
            this.timeout(1000);

            assert.throws(() => {
                formats.formatValue('value', value, targetType)
            });
        });
    });
}

// ----------------------------------------------------------------------------------------

describe('Format Conversion', function () {
    it(`default value is returned for undefined`, function () {
        this.timeout(1000);

        let result = formats.formatValue('value', undefined, formats.STRING, 'default value for test');
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
    testConvertsToValue(convertToTrue, formats.BOOL, true, 'boolean true');


    let convertToFalse = [
        false,
        'false',
        'off',
        'no',
        0,
        '0',
    ];
    testConvertsToValue(convertToFalse, formats.BOOL, false, 'boolean false');


    let convertToString10 = [
        10,
        '10',
    ];
    testConvertsToValue(convertToString10, formats.STRING, '10', 'string "10"');


    let convertToFloat10point5 = [
        10.5,
        '10.5',
    ];
    testConvertsToValue(convertToFloat10point5, formats.FLOAT, 10.5, 'float 10.5');


    let convertToInt10 = [
        10,
        '10',
        10.5,
        '10.5',
        '0x00000A',
        '#00000A',
    ];
    testConvertsToValue(convertToInt10, formats.INT, 10, 'int 10');

    let convertToStringTrue = [
        true,
        'true',
    ];
    testConvertsToValue(convertToStringTrue, formats.STRING, 'true', 'string true');

    let convertToStringFalse = [
        false,
        'false',
    ];
    testConvertsToValue(convertToStringFalse, formats.STRING, 'false', 'string false');


    let errorWhenConvertedToBool = [
        undefined,
        'somevalue',
    ];
    testForError(errorWhenConvertedToBool, formats.BOOL, 'bool');


    let errorWhenConvertedToFloat = [
        undefined,
        'somevalue',
    ];
    testForError(errorWhenConvertedToFloat, formats.FLOAT, 'float');
});
