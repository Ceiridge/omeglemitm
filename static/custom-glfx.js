/*
 * glfx.js {@link http://wassname.github.com/glfx.js/}
 *
 * @author Evan Wallace
 * @copyright Copyright 2011 Evan Wallace.
 * @licence {@link https://github.com/wassname/glfx.js/blob/master/LICENCE|MIT License}
 */
var fx = (function() {
	var exports = {};

// src/OES_texture_float_linear-polyfill.js
// From: https://github.com/evanw/OES_texture_float_linear-polyfill
	(function() {
		// Uploads a 2x2 floating-point texture where one pixel is 2 and the other
		// three pixels are 0. Linear filtering is only supported if a sample taken
		// from the center of that texture is (2 + 0 + 0 + 0) / 4 = 0.5.
		function supportsOESTextureFloatLinear(gl) {
			// Need floating point textures in the first place
			if (!gl.getExtension('OES_texture_float')) {
				return false;
			}

			// Create a render target
			var framebuffer = gl.createFramebuffer();
			var byteTexture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, byteTexture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, byteTexture, 0);

			// Create a simple floating-point texture with value of 0.5 in the center
			var rgba = [
				2, 0, 0, 0,
				0, 0, 0, 0,
				0, 0, 0, 0,
				0, 0, 0, 0
			];
			var floatTexture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, floatTexture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.FLOAT, new Float32Array(rgba));

			// Create the test shader
			var program = gl.createProgram();
			var vertexShader = gl.createShader(gl.VERTEX_SHADER);
			var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(vertexShader, '\
      attribute vec2 vertex;\
      void main() {\
        gl_Position = vec4(vertex, 0.0, 1.0);\
      }\
    ');
			gl.shaderSource(fragmentShader, '\
      uniform sampler2D texture;\
      void main() {\
        gl_FragColor = texture2D(texture, vec2(0.5));\
      }\
    ');
			gl.compileShader(vertexShader);
			gl.compileShader(fragmentShader);
			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);
			gl.linkProgram(program);

			// Create a buffer containing a single point
			var buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0]), gl.STREAM_DRAW);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

			// Render the point and read back the rendered pixel
			var pixel = new Uint8Array(4);
			gl.useProgram(program);
			gl.viewport(0, 0, 1, 1);
			gl.bindTexture(gl.TEXTURE_2D, floatTexture);
			gl.drawArrays(gl.POINTS, 0, 1);
			gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

			// The center sample will only have a value of 0.5 if linear filtering works
			return pixel[0] === 127 || pixel[0] === 128;
		}

		// The constructor for the returned extension object
		function OESTextureFloatLinear() {
		}

		// Cache the extension so it's specific to each context like extensions should be
		function getOESTextureFloatLinear(gl) {
			if (gl.$OES_texture_float_linear$ === void 0) {
				Object.defineProperty(gl, '$OES_texture_float_linear$', {
					enumerable: false,
					configurable: false,
					writable: false,
					value: new OESTextureFloatLinear()
				});
			}
			return gl.$OES_texture_float_linear$;
		}

		// This replaces the real getExtension()
		function getExtension(name) {
			return name === 'OES_texture_float_linear'
				? getOESTextureFloatLinear(this)
				: oldGetExtension.call(this, name);
		}

		// This replaces the real getSupportedExtensions()
		function getSupportedExtensions() {
			var extensions = oldGetSupportedExtensions.call(this);
			if (extensions.indexOf('OES_texture_float_linear') === -1) {
				extensions.push('OES_texture_float_linear');
			}
			return extensions;
		}

		// Get a WebGL context
		try {
			var gl = document.createElement('canvas').getContext('experimental-webgl');
		} catch (e) {
		}

		// Don't install the polyfill if the browser already supports it or doesn't have WebGL
		if (!gl || gl.getSupportedExtensions().indexOf('OES_texture_float_linear') !== -1) {
			return;
		}

		// Install the polyfill if linear filtering works with floating-point textures
		if (supportsOESTextureFloatLinear(gl)) {
			var oldGetExtension = WebGLRenderingContext.prototype.getExtension;
			var oldGetSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;
			WebGLRenderingContext.prototype.getExtension = getExtension;
			WebGLRenderingContext.prototype.getSupportedExtensions = getSupportedExtensions;
		}
	}());

// src/filters/glmatrix.js
	/**
	 * @fileoverview gl-matrix - High performance matrix and vector operations for WebGL
	 * @author Brandon Jones
	 * @version 1.2.4
	 */

	/*
 * Copyright (c) 2011 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

	"use strict";

	global=window;

// Type declarations
	(function(_global) {
		// account for CommonJS environments
		_global.glMatrixArrayType = _global.MatrixArray = null;

		/**
		 * @class 3 Dimensional Vector
		 * @name vec3
		 */
		_global.vec3 = {};

		/**
		 * @class 3x3 Matrix
		 * @name mat3
		 */
		_global.mat3 = {};

		/**
		 * @class 4x4 Matrix
		 * @name mat4
		 */
		_global.mat4 = {};

		/**
		 * @class Quaternion
		 * @name quat4
		 */
		_global.quat4 = {};

		// explicitly sets and returns the type of array to use within glMatrix
		_global.setMatrixArrayType = function(type) {
			return glMatrixArrayType = MatrixArray = type;
		};

		// auto-detects and returns the best type of array to use within glMatrix, falling
		// back to Array if typed arrays are unsupported
		_global.determineMatrixArrayType = function() {
			return setMatrixArrayType((typeof Float32Array !== 'undefined') ? Float32Array : Array);
		};

		determineMatrixArrayType();
	})((typeof(exports) != 'undefined') ? global : this);

	/*
 * vec3
 */

	/**
	 * Creates a new instance of a vec3 using the default array type
	 * Any javascript array-like objects containing at least 3 numeric elements can serve as a vec3
	 *
	 * @param {vec3} [vec] vec3 containing values to initialize with
	 *
	 * @returns {vec3} New vec3
	 */
	vec3.create = function (vec) {
		var dest = new MatrixArray(3);

		if (vec) {
			dest[0] = vec[0];
			dest[1] = vec[1];
			dest[2] = vec[2];
		} else {
			dest[0] = dest[1] = dest[2] = 0;
		}

		return dest;
	};

	/**
	 * Copies the values of one vec3 to another
	 *
	 * @param {vec3} vec vec3 containing values to copy
	 * @param {vec3} dest vec3 receiving copied values
	 *
	 * @returns {vec3} dest
	 */
	vec3.set = function (vec, dest) {
		dest[0] = vec[0];
		dest[1] = vec[1];
		dest[2] = vec[2];

		return dest;
	};

	/**
	 * Performs a vector addition
	 *
	 * @param {vec3} vec First operand
	 * @param {vec3} vec2 Second operand
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	vec3.add = function (vec, vec2, dest) {
		if (!dest || vec === dest) {
			vec[0] += vec2[0];
			vec[1] += vec2[1];
			vec[2] += vec2[2];
			return vec;
		}

		dest[0] = vec[0] + vec2[0];
		dest[1] = vec[1] + vec2[1];
		dest[2] = vec[2] + vec2[2];
		return dest;
	};

	/**
	 * Performs a vector subtraction
	 *
	 * @param {vec3} vec First operand
	 * @param {vec3} vec2 Second operand
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	vec3.subtract = function (vec, vec2, dest) {
		if (!dest || vec === dest) {
			vec[0] -= vec2[0];
			vec[1] -= vec2[1];
			vec[2] -= vec2[2];
			return vec;
		}

		dest[0] = vec[0] - vec2[0];
		dest[1] = vec[1] - vec2[1];
		dest[2] = vec[2] - vec2[2];
		return dest;
	};

	/**
	 * Performs a vector multiplication
	 *
	 * @param {vec3} vec First operand
	 * @param {vec3} vec2 Second operand
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	vec3.multiply = function (vec, vec2, dest) {
		if (!dest || vec === dest) {
			vec[0] *= vec2[0];
			vec[1] *= vec2[1];
			vec[2] *= vec2[2];
			return vec;
		}

		dest[0] = vec[0] * vec2[0];
		dest[1] = vec[1] * vec2[1];
		dest[2] = vec[2] * vec2[2];
		return dest;
	};

	/**
	 * Negates the components of a vec3
	 *
	 * @param {vec3} vec vec3 to negate
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	vec3.negate = function (vec, dest) {
		if (!dest) { dest = vec; }

		dest[0] = -vec[0];
		dest[1] = -vec[1];
		dest[2] = -vec[2];
		return dest;
	};

	/**
	 * Multiplies the components of a vec3 by a scalar value
	 *
	 * @param {vec3} vec vec3 to scale
	 * @param {number} val Value to scale by
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	vec3.scale = function (vec, val, dest) {
		if (!dest || vec === dest) {
			vec[0] *= val;
			vec[1] *= val;
			vec[2] *= val;
			return vec;
		}

		dest[0] = vec[0] * val;
		dest[1] = vec[1] * val;
		dest[2] = vec[2] * val;
		return dest;
	};

	/**
	 * Generates a unit vector of the same direction as the provided vec3
	 * If vector length is 0, returns [0, 0, 0]
	 *
	 * @param {vec3} vec vec3 to normalize
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	vec3.normalize = function (vec, dest) {
		if (!dest) { dest = vec; }

		var x = vec[0], y = vec[1], z = vec[2],
			len = Math.sqrt(x * x + y * y + z * z);

		if (!len) {
			dest[0] = 0;
			dest[1] = 0;
			dest[2] = 0;
			return dest;
		} else if (len === 1) {
			dest[0] = x;
			dest[1] = y;
			dest[2] = z;
			return dest;
		}

		len = 1 / len;
		dest[0] = x * len;
		dest[1] = y * len;
		dest[2] = z * len;
		return dest;
	};

	/**
	 * Generates the cross product of two vec3s
	 *
	 * @param {vec3} vec First operand
	 * @param {vec3} vec2 Second operand
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	vec3.cross = function (vec, vec2, dest) {
		if (!dest) { dest = vec; }

		var x = vec[0], y = vec[1], z = vec[2],
			x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];

		dest[0] = y * z2 - z * y2;
		dest[1] = z * x2 - x * z2;
		dest[2] = x * y2 - y * x2;
		return dest;
	};

	/**
	 * Caclulates the length of a vec3
	 *
	 * @param {vec3} vec vec3 to calculate length of
	 *
	 * @returns {number} Length of vec
	 */
	vec3.length = function (vec) {
		var x = vec[0], y = vec[1], z = vec[2];
		return Math.sqrt(x * x + y * y + z * z);
	};

	/**
	 * Caclulates the dot product of two vec3s
	 *
	 * @param {vec3} vec First operand
	 * @param {vec3} vec2 Second operand
	 *
	 * @returns {number} Dot product of vec and vec2
	 */
	vec3.dot = function (vec, vec2) {
		return vec[0] * vec2[0] + vec[1] * vec2[1] + vec[2] * vec2[2];
	};

	/**
	 * Generates a unit vector pointing from one vector to another
	 *
	 * @param {vec3} vec Origin vec3
	 * @param {vec3} vec2 vec3 to point to
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	vec3.direction = function (vec, vec2, dest) {
		if (!dest) { dest = vec; }

		var x = vec[0] - vec2[0],
			y = vec[1] - vec2[1],
			z = vec[2] - vec2[2],
			len = Math.sqrt(x * x + y * y + z * z);

		if (!len) {
			dest[0] = 0;
			dest[1] = 0;
			dest[2] = 0;
			return dest;
		}

		len = 1 / len;
		dest[0] = x * len;
		dest[1] = y * len;
		dest[2] = z * len;
		return dest;
	};

	/**
	 * Performs a linear interpolation between two vec3
	 *
	 * @param {vec3} vec First vector
	 * @param {vec3} vec2 Second vector
	 * @param {number} lerp Interpolation amount between the two inputs
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	vec3.lerp = function (vec, vec2, lerp, dest) {
		if (!dest) { dest = vec; }

		dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
		dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
		dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);

		return dest;
	};

	/**
	 * Calculates the euclidian distance between two vec3
	 *
	 * Params:
	 * @param {vec3} vec First vector
	 * @param {vec3} vec2 Second vector
	 *
	 * @returns {number} Distance between vec and vec2
	 */
	vec3.dist = function (vec, vec2) {
		var x = vec2[0] - vec[0],
			y = vec2[1] - vec[1],
			z = vec2[2] - vec[2];

		return Math.sqrt(x*x + y*y + z*z);
	};

	/**
	 * Projects the specified vec3 from screen space into object space
	 * Based on the <a href="http://webcvs.freedesktop.org/mesa/Mesa/src/glu/mesa/project.c?revision=1.4&view=markup">Mesa gluUnProject implementation</a>
	 *
	 * @param {vec3} vec Screen-space vector to project
	 * @param {mat4} view View matrix
	 * @param {mat4} proj Projection matrix
	 * @param {vec4} viewport Viewport as given to gl.viewport [x, y, width, height]
	 * @param {vec3} [dest] vec3 receiving unprojected result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	vec3.unproject = function (vec, view, proj, viewport, dest) {
		if (!dest) { dest = vec; }

		var m = mat4.create();
		var v = new MatrixArray(4);

		v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
		v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
		v[2] = 2.0 * vec[2] - 1.0;
		v[3] = 1.0;

		mat4.multiply(proj, view, m);
		if(!mat4.inverse(m)) { return null; }

		mat4.multiplyVec4(m, v);
		if(v[3] === 0.0) { return null; }

		dest[0] = v[0] / v[3];
		dest[1] = v[1] / v[3];
		dest[2] = v[2] / v[3];

		return dest;
	};

	/**
	 * Returns a string representation of a vector
	 *
	 * @param {vec3} vec Vector to represent as a string
	 *
	 * @returns {string} String representation of vec
	 */
	vec3.str = function (vec) {
		return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']';
	};

	/*
 * mat3
 */

	/**
	 * Creates a new instance of a mat3 using the default array type
	 * Any javascript array-like object containing at least 9 numeric elements can serve as a mat3
	 *
	 * @param {mat3} [mat] mat3 containing values to initialize with
	 *
	 * @returns {mat3} New mat3
	 */
	mat3.create = function (mat) {
		var dest = new MatrixArray(9);

		if (mat) {
			dest[0] = mat[0];
			dest[1] = mat[1];
			dest[2] = mat[2];
			dest[3] = mat[3];
			dest[4] = mat[4];
			dest[5] = mat[5];
			dest[6] = mat[6];
			dest[7] = mat[7];
			dest[8] = mat[8];
		}

		return dest;
	};

	/**
	 * Copies the values of one mat3 to another
	 *
	 * @param {mat3} mat mat3 containing values to copy
	 * @param {mat3} dest mat3 receiving copied values
	 *
	 * @returns {mat3} dest
	 */
	mat3.set = function (mat, dest) {
		dest[0] = mat[0];
		dest[1] = mat[1];
		dest[2] = mat[2];
		dest[3] = mat[3];
		dest[4] = mat[4];
		dest[5] = mat[5];
		dest[6] = mat[6];
		dest[7] = mat[7];
		dest[8] = mat[8];
		return dest;
	};

	/**
	 * Sets a mat3 to an identity matrix
	 *
	 * @param {mat3} dest mat3 to set
	 *
	 * @returns dest if specified, otherwise a new mat3
	 */
	mat3.identity = function (dest) {
		if (!dest) { dest = mat3.create(); }
		dest[0] = 1;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		dest[4] = 1;
		dest[5] = 0;
		dest[6] = 0;
		dest[7] = 0;
		dest[8] = 1;
		return dest;
	};

	/**
	 * Transposes a mat3 (flips the values over the diagonal)
	 *
	 * Params:
	 * @param {mat3} mat mat3 to transpose
	 * @param {mat3} [dest] mat3 receiving transposed values. If not specified result is written to mat
	 *
	 * @returns {mat3} dest is specified, mat otherwise
	 */
	mat3.transpose = function (mat, dest) {
		// If we are transposing ourselves we can skip a few steps but have to cache some values
		if (!dest || mat === dest) {
			var a01 = mat[1], a02 = mat[2],
				a12 = mat[5];

			mat[1] = mat[3];
			mat[2] = mat[6];
			mat[3] = a01;
			mat[5] = mat[7];
			mat[6] = a02;
			mat[7] = a12;
			return mat;
		}

		dest[0] = mat[0];
		dest[1] = mat[3];
		dest[2] = mat[6];
		dest[3] = mat[1];
		dest[4] = mat[4];
		dest[5] = mat[7];
		dest[6] = mat[2];
		dest[7] = mat[5];
		dest[8] = mat[8];
		return dest;
	};

	/**
	 * Copies the elements of a mat3 into the upper 3x3 elements of a mat4
	 *
	 * @param {mat3} mat mat3 containing values to copy
	 * @param {mat4} [dest] mat4 receiving copied values
	 *
	 * @returns {mat4} dest if specified, a new mat4 otherwise
	 */
	mat3.toMat4 = function (mat, dest) {
		if (!dest) { dest = mat4.create(); }

		dest[15] = 1;
		dest[14] = 0;
		dest[13] = 0;
		dest[12] = 0;

		dest[11] = 0;
		dest[10] = mat[8];
		dest[9] = mat[7];
		dest[8] = mat[6];

		dest[7] = 0;
		dest[6] = mat[5];
		dest[5] = mat[4];
		dest[4] = mat[3];

		dest[3] = 0;
		dest[2] = mat[2];
		dest[1] = mat[1];
		dest[0] = mat[0];

		return dest;
	};

	/**
	 * Returns a string representation of a mat3
	 *
	 * @param {mat3} mat mat3 to represent as a string
	 *
	 * @param {string} String representation of mat
	 */
	mat3.str = function (mat) {
		return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] +
			', ' + mat[3] + ', ' + mat[4] + ', ' + mat[5] +
			', ' + mat[6] + ', ' + mat[7] + ', ' + mat[8] + ']';
	};

	/*
 * mat4
 */

	/**
	 * Creates a new instance of a mat4 using the default array type
	 * Any javascript array-like object containing at least 16 numeric elements can serve as a mat4
	 *
	 * @param {mat4} [mat] mat4 containing values to initialize with
	 *
	 * @returns {mat4} New mat4
	 */
	mat4.create = function (mat) {
		var dest = new MatrixArray(16);

		if (mat) {
			dest[0] = mat[0];
			dest[1] = mat[1];
			dest[2] = mat[2];
			dest[3] = mat[3];
			dest[4] = mat[4];
			dest[5] = mat[5];
			dest[6] = mat[6];
			dest[7] = mat[7];
			dest[8] = mat[8];
			dest[9] = mat[9];
			dest[10] = mat[10];
			dest[11] = mat[11];
			dest[12] = mat[12];
			dest[13] = mat[13];
			dest[14] = mat[14];
			dest[15] = mat[15];
		}

		return dest;
	};

	/**
	 * Copies the values of one mat4 to another
	 *
	 * @param {mat4} mat mat4 containing values to copy
	 * @param {mat4} dest mat4 receiving copied values
	 *
	 * @returns {mat4} dest
	 */
	mat4.set = function (mat, dest) {
		dest[0] = mat[0];
		dest[1] = mat[1];
		dest[2] = mat[2];
		dest[3] = mat[3];
		dest[4] = mat[4];
		dest[5] = mat[5];
		dest[6] = mat[6];
		dest[7] = mat[7];
		dest[8] = mat[8];
		dest[9] = mat[9];
		dest[10] = mat[10];
		dest[11] = mat[11];
		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
		return dest;
	};

	/**
	 * Sets a mat4 to an identity matrix
	 *
	 * @param {mat4} dest mat4 to set
	 *
	 * @returns {mat4} dest
	 */
	mat4.identity = function (dest) {
		if (!dest) { dest = mat4.create(); }
		dest[0] = 1;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		dest[4] = 0;
		dest[5] = 1;
		dest[6] = 0;
		dest[7] = 0;
		dest[8] = 0;
		dest[9] = 0;
		dest[10] = 1;
		dest[11] = 0;
		dest[12] = 0;
		dest[13] = 0;
		dest[14] = 0;
		dest[15] = 1;
		return dest;
	};

	/**
	 * Transposes a mat4 (flips the values over the diagonal)
	 *
	 * @param {mat4} mat mat4 to transpose
	 * @param {mat4} [dest] mat4 receiving transposed values. If not specified result is written to mat
	 *
	 * @param {mat4} dest is specified, mat otherwise
	 */
	mat4.transpose = function (mat, dest) {
		// If we are transposing ourselves we can skip a few steps but have to cache some values
		if (!dest || mat === dest) {
			var a01 = mat[1], a02 = mat[2], a03 = mat[3],
				a12 = mat[6], a13 = mat[7],
				a23 = mat[11];

			mat[1] = mat[4];
			mat[2] = mat[8];
			mat[3] = mat[12];
			mat[4] = a01;
			mat[6] = mat[9];
			mat[7] = mat[13];
			mat[8] = a02;
			mat[9] = a12;
			mat[11] = mat[14];
			mat[12] = a03;
			mat[13] = a13;
			mat[14] = a23;
			return mat;
		}

		dest[0] = mat[0];
		dest[1] = mat[4];
		dest[2] = mat[8];
		dest[3] = mat[12];
		dest[4] = mat[1];
		dest[5] = mat[5];
		dest[6] = mat[9];
		dest[7] = mat[13];
		dest[8] = mat[2];
		dest[9] = mat[6];
		dest[10] = mat[10];
		dest[11] = mat[14];
		dest[12] = mat[3];
		dest[13] = mat[7];
		dest[14] = mat[11];
		dest[15] = mat[15];
		return dest;
	};

	/**
	 * Calculates the determinant of a mat4
	 *
	 * @param {mat4} mat mat4 to calculate determinant of
	 *
	 * @returns {number} determinant of mat
	 */
	mat4.determinant = function (mat) {
		// Cache the matrix values (makes for huge speed increases!)
		var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
			a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
			a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
			a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

		return (a30 * a21 * a12 * a03 - a20 * a31 * a12 * a03 - a30 * a11 * a22 * a03 + a10 * a31 * a22 * a03 +
			a20 * a11 * a32 * a03 - a10 * a21 * a32 * a03 - a30 * a21 * a02 * a13 + a20 * a31 * a02 * a13 +
			a30 * a01 * a22 * a13 - a00 * a31 * a22 * a13 - a20 * a01 * a32 * a13 + a00 * a21 * a32 * a13 +
			a30 * a11 * a02 * a23 - a10 * a31 * a02 * a23 - a30 * a01 * a12 * a23 + a00 * a31 * a12 * a23 +
			a10 * a01 * a32 * a23 - a00 * a11 * a32 * a23 - a20 * a11 * a02 * a33 + a10 * a21 * a02 * a33 +
			a20 * a01 * a12 * a33 - a00 * a21 * a12 * a33 - a10 * a01 * a22 * a33 + a00 * a11 * a22 * a33);
	};

	/**
	 * Calculates the inverse matrix of a mat4
	 *
	 * @param {mat4} mat mat4 to calculate inverse of
	 * @param {mat4} [dest] mat4 receiving inverse matrix. If not specified result is written to mat
	 *
	 * @param {mat4} dest is specified, mat otherwise, null if matrix cannot be inverted
	 */
	mat4.inverse = function (mat, dest) {
		if (!dest) { dest = mat; }

		// Cache the matrix values (makes for huge speed increases!)
		var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
			a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
			a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
			a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

			b00 = a00 * a11 - a01 * a10,
			b01 = a00 * a12 - a02 * a10,
			b02 = a00 * a13 - a03 * a10,
			b03 = a01 * a12 - a02 * a11,
			b04 = a01 * a13 - a03 * a11,
			b05 = a02 * a13 - a03 * a12,
			b06 = a20 * a31 - a21 * a30,
			b07 = a20 * a32 - a22 * a30,
			b08 = a20 * a33 - a23 * a30,
			b09 = a21 * a32 - a22 * a31,
			b10 = a21 * a33 - a23 * a31,
			b11 = a22 * a33 - a23 * a32,

			d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
			invDet;

		// Calculate the determinant
		if (!d) { return null; }
		invDet = 1 / d;

		dest[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
		dest[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
		dest[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
		dest[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
		dest[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
		dest[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
		dest[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
		dest[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
		dest[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
		dest[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
		dest[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
		dest[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
		dest[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
		dest[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
		dest[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
		dest[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;

		return dest;
	};

	/**
	 * Copies the upper 3x3 elements of a mat4 into another mat4
	 *
	 * @param {mat4} mat mat4 containing values to copy
	 * @param {mat4} [dest] mat4 receiving copied values
	 *
	 * @returns {mat4} dest is specified, a new mat4 otherwise
	 */
	mat4.toRotationMat = function (mat, dest) {
		if (!dest) { dest = mat4.create(); }

		dest[0] = mat[0];
		dest[1] = mat[1];
		dest[2] = mat[2];
		dest[3] = mat[3];
		dest[4] = mat[4];
		dest[5] = mat[5];
		dest[6] = mat[6];
		dest[7] = mat[7];
		dest[8] = mat[8];
		dest[9] = mat[9];
		dest[10] = mat[10];
		dest[11] = mat[11];
		dest[12] = 0;
		dest[13] = 0;
		dest[14] = 0;
		dest[15] = 1;

		return dest;
	};

	/**
	 * Copies the upper 3x3 elements of a mat4 into a mat3
	 *
	 * @param {mat4} mat mat4 containing values to copy
	 * @param {mat3} [dest] mat3 receiving copied values
	 *
	 * @returns {mat3} dest is specified, a new mat3 otherwise
	 */
	mat4.toMat3 = function (mat, dest) {
		if (!dest) { dest = mat3.create(); }

		dest[0] = mat[0];
		dest[1] = mat[1];
		dest[2] = mat[2];
		dest[3] = mat[4];
		dest[4] = mat[5];
		dest[5] = mat[6];
		dest[6] = mat[8];
		dest[7] = mat[9];
		dest[8] = mat[10];

		return dest;
	};

	/**
	 * Calculates the inverse of the upper 3x3 elements of a mat4 and copies the result into a mat3
	 * The resulting matrix is useful for calculating transformed normals
	 *
	 * Params:
	 * @param {mat4} mat mat4 containing values to invert and copy
	 * @param {mat3} [dest] mat3 receiving values
	 *
	 * @returns {mat3} dest is specified, a new mat3 otherwise, null if the matrix cannot be inverted
	 */
	mat4.toInverseMat3 = function (mat, dest) {
		// Cache the matrix values (makes for huge speed increases!)
		var a00 = mat[0], a01 = mat[1], a02 = mat[2],
			a10 = mat[4], a11 = mat[5], a12 = mat[6],
			a20 = mat[8], a21 = mat[9], a22 = mat[10],

			b01 = a22 * a11 - a12 * a21,
			b11 = -a22 * a10 + a12 * a20,
			b21 = a21 * a10 - a11 * a20,

			d = a00 * b01 + a01 * b11 + a02 * b21,
			id;

		if (!d) { return null; }
		id = 1 / d;

		if (!dest) { dest = mat3.create(); }

		dest[0] = b01 * id;
		dest[1] = (-a22 * a01 + a02 * a21) * id;
		dest[2] = (a12 * a01 - a02 * a11) * id;
		dest[3] = b11 * id;
		dest[4] = (a22 * a00 - a02 * a20) * id;
		dest[5] = (-a12 * a00 + a02 * a10) * id;
		dest[6] = b21 * id;
		dest[7] = (-a21 * a00 + a01 * a20) * id;
		dest[8] = (a11 * a00 - a01 * a10) * id;

		return dest;
	};

	/**
	 * Performs a matrix multiplication
	 *
	 * @param {mat4} mat First operand
	 * @param {mat4} mat2 Second operand
	 * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
	 *
	 * @returns {mat4} dest if specified, mat otherwise
	 */
	mat4.multiply = function (mat, mat2, dest) {
		if (!dest) { dest = mat; }

		// Cache the matrix values (makes for huge speed increases!)
		var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
			a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
			a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
			a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

			b00 = mat2[0], b01 = mat2[1], b02 = mat2[2], b03 = mat2[3],
			b10 = mat2[4], b11 = mat2[5], b12 = mat2[6], b13 = mat2[7],
			b20 = mat2[8], b21 = mat2[9], b22 = mat2[10], b23 = mat2[11],
			b30 = mat2[12], b31 = mat2[13], b32 = mat2[14], b33 = mat2[15];

		dest[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
		dest[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
		dest[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
		dest[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
		dest[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
		dest[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
		dest[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
		dest[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
		dest[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
		dest[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
		dest[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
		dest[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
		dest[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
		dest[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
		dest[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
		dest[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;

		return dest;
	};

	/**
	 * Transforms a vec3 with the given matrix
	 * 4th vector component is implicitly '1'
	 *
	 * @param {mat4} mat mat4 to transform the vector with
	 * @param {vec3} vec vec3 to transform
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec3} dest if specified, vec otherwise
	 */
	mat4.multiplyVec3 = function (mat, vec, dest) {
		if (!dest) { dest = vec; }

		var x = vec[0], y = vec[1], z = vec[2];

		dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
		dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
		dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];

		return dest;
	};

	/**
	 * Transforms a vec4 with the given matrix
	 *
	 * @param {mat4} mat mat4 to transform the vector with
	 * @param {vec4} vec vec4 to transform
	 * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vec
	 *
	 * @returns {vec4} dest if specified, vec otherwise
	 */
	mat4.multiplyVec4 = function (mat, vec, dest) {
		if (!dest) { dest = vec; }

		var x = vec[0], y = vec[1], z = vec[2], w = vec[3];

		dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12] * w;
		dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13] * w;
		dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14] * w;
		dest[3] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15] * w;

		return dest;
	};

	/**
	 * Translates a matrix by the given vector
	 *
	 * @param {mat4} mat mat4 to translate
	 * @param {vec3} vec vec3 specifying the translation
	 * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
	 *
	 * @returns {mat4} dest if specified, mat otherwise
	 */
	mat4.translate = function (mat, vec, dest) {
		var x = vec[0], y = vec[1], z = vec[2],
			a00, a01, a02, a03,
			a10, a11, a12, a13,
			a20, a21, a22, a23;

		if (!dest || mat === dest) {
			mat[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
			mat[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
			mat[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
			mat[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
			return mat;
		}

		a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
		a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
		a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];

		dest[0] = a00; dest[1] = a01; dest[2] = a02; dest[3] = a03;
		dest[4] = a10; dest[5] = a11; dest[6] = a12; dest[7] = a13;
		dest[8] = a20; dest[9] = a21; dest[10] = a22; dest[11] = a23;

		dest[12] = a00 * x + a10 * y + a20 * z + mat[12];
		dest[13] = a01 * x + a11 * y + a21 * z + mat[13];
		dest[14] = a02 * x + a12 * y + a22 * z + mat[14];
		dest[15] = a03 * x + a13 * y + a23 * z + mat[15];
		return dest;
	};

	/**
	 * Scales a matrix by the given vector
	 *
	 * @param {mat4} mat mat4 to scale
	 * @param {vec3} vec vec3 specifying the scale for each axis
	 * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
	 *
	 * @param {mat4} dest if specified, mat otherwise
	 */
	mat4.scale = function (mat, vec, dest) {
		var x = vec[0], y = vec[1], z = vec[2];

		if (!dest || mat === dest) {
			mat[0] *= x;
			mat[1] *= x;
			mat[2] *= x;
			mat[3] *= x;
			mat[4] *= y;
			mat[5] *= y;
			mat[6] *= y;
			mat[7] *= y;
			mat[8] *= z;
			mat[9] *= z;
			mat[10] *= z;
			mat[11] *= z;
			return mat;
		}

		dest[0] = mat[0] * x;
		dest[1] = mat[1] * x;
		dest[2] = mat[2] * x;
		dest[3] = mat[3] * x;
		dest[4] = mat[4] * y;
		dest[5] = mat[5] * y;
		dest[6] = mat[6] * y;
		dest[7] = mat[7] * y;
		dest[8] = mat[8] * z;
		dest[9] = mat[9] * z;
		dest[10] = mat[10] * z;
		dest[11] = mat[11] * z;
		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
		return dest;
	};

	/**
	 * Rotates a matrix by the given angle around the specified axis
	 * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
	 *
	 * @param {mat4} mat mat4 to rotate
	 * @param {number} angle Angle (in radians) to rotate
	 * @param {vec3} axis vec3 representing the axis to rotate around
	 * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
	 *
	 * @returns {mat4} dest if specified, mat otherwise
	 */
	mat4.rotate = function (mat, angle, axis, dest) {
		var x = axis[0], y = axis[1], z = axis[2],
			len = Math.sqrt(x * x + y * y + z * z),
			s, c, t,
			a00, a01, a02, a03,
			a10, a11, a12, a13,
			a20, a21, a22, a23,
			b00, b01, b02,
			b10, b11, b12,
			b20, b21, b22;

		if (!len) { return null; }
		if (len !== 1) {
			len = 1 / len;
			x *= len;
			y *= len;
			z *= len;
		}

		s = Math.sin(angle);
		c = Math.cos(angle);
		t = 1 - c;

		a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
		a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
		a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];

		// Construct the elements of the rotation matrix
		b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
		b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
		b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

		if (!dest) {
			dest = mat;
		} else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
			dest[12] = mat[12];
			dest[13] = mat[13];
			dest[14] = mat[14];
			dest[15] = mat[15];
		}

		// Perform rotation-specific matrix multiplication
		dest[0] = a00 * b00 + a10 * b01 + a20 * b02;
		dest[1] = a01 * b00 + a11 * b01 + a21 * b02;
		dest[2] = a02 * b00 + a12 * b01 + a22 * b02;
		dest[3] = a03 * b00 + a13 * b01 + a23 * b02;

		dest[4] = a00 * b10 + a10 * b11 + a20 * b12;
		dest[5] = a01 * b10 + a11 * b11 + a21 * b12;
		dest[6] = a02 * b10 + a12 * b11 + a22 * b12;
		dest[7] = a03 * b10 + a13 * b11 + a23 * b12;

		dest[8] = a00 * b20 + a10 * b21 + a20 * b22;
		dest[9] = a01 * b20 + a11 * b21 + a21 * b22;
		dest[10] = a02 * b20 + a12 * b21 + a22 * b22;
		dest[11] = a03 * b20 + a13 * b21 + a23 * b22;
		return dest;
	};

	/**
	 * Rotates a matrix by the given angle around the X axis
	 *
	 * @param {mat4} mat mat4 to rotate
	 * @param {number} angle Angle (in radians) to rotate
	 * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
	 *
	 * @returns {mat4} dest if specified, mat otherwise
	 */
	mat4.rotateX = function (mat, angle, dest) {
		var s = Math.sin(angle),
			c = Math.cos(angle),
			a10 = mat[4],
			a11 = mat[5],
			a12 = mat[6],
			a13 = mat[7],
			a20 = mat[8],
			a21 = mat[9],
			a22 = mat[10],
			a23 = mat[11];

		if (!dest) {
			dest = mat;
		} else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
			dest[0] = mat[0];
			dest[1] = mat[1];
			dest[2] = mat[2];
			dest[3] = mat[3];

			dest[12] = mat[12];
			dest[13] = mat[13];
			dest[14] = mat[14];
			dest[15] = mat[15];
		}

		// Perform axis-specific matrix multiplication
		dest[4] = a10 * c + a20 * s;
		dest[5] = a11 * c + a21 * s;
		dest[6] = a12 * c + a22 * s;
		dest[7] = a13 * c + a23 * s;

		dest[8] = a10 * -s + a20 * c;
		dest[9] = a11 * -s + a21 * c;
		dest[10] = a12 * -s + a22 * c;
		dest[11] = a13 * -s + a23 * c;
		return dest;
	};

	/**
	 * Rotates a matrix by the given angle around the Y axis
	 *
	 * @param {mat4} mat mat4 to rotate
	 * @param {number} angle Angle (in radians) to rotate
	 * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
	 *
	 * @returns {mat4} dest if specified, mat otherwise
	 */
	mat4.rotateY = function (mat, angle, dest) {
		var s = Math.sin(angle),
			c = Math.cos(angle),
			a00 = mat[0],
			a01 = mat[1],
			a02 = mat[2],
			a03 = mat[3],
			a20 = mat[8],
			a21 = mat[9],
			a22 = mat[10],
			a23 = mat[11];

		if (!dest) {
			dest = mat;
		} else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
			dest[4] = mat[4];
			dest[5] = mat[5];
			dest[6] = mat[6];
			dest[7] = mat[7];

			dest[12] = mat[12];
			dest[13] = mat[13];
			dest[14] = mat[14];
			dest[15] = mat[15];
		}

		// Perform axis-specific matrix multiplication
		dest[0] = a00 * c + a20 * -s;
		dest[1] = a01 * c + a21 * -s;
		dest[2] = a02 * c + a22 * -s;
		dest[3] = a03 * c + a23 * -s;

		dest[8] = a00 * s + a20 * c;
		dest[9] = a01 * s + a21 * c;
		dest[10] = a02 * s + a22 * c;
		dest[11] = a03 * s + a23 * c;
		return dest;
	};

	/**
	 * Rotates a matrix by the given angle around the Z axis
	 *
	 * @param {mat4} mat mat4 to rotate
	 * @param {number} angle Angle (in radians) to rotate
	 * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
	 *
	 * @returns {mat4} dest if specified, mat otherwise
	 */
	mat4.rotateZ = function (mat, angle, dest) {
		var s = Math.sin(angle),
			c = Math.cos(angle),
			a00 = mat[0],
			a01 = mat[1],
			a02 = mat[2],
			a03 = mat[3],
			a10 = mat[4],
			a11 = mat[5],
			a12 = mat[6],
			a13 = mat[7];

		if (!dest) {
			dest = mat;
		} else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
			dest[8] = mat[8];
			dest[9] = mat[9];
			dest[10] = mat[10];
			dest[11] = mat[11];

			dest[12] = mat[12];
			dest[13] = mat[13];
			dest[14] = mat[14];
			dest[15] = mat[15];
		}

		// Perform axis-specific matrix multiplication
		dest[0] = a00 * c + a10 * s;
		dest[1] = a01 * c + a11 * s;
		dest[2] = a02 * c + a12 * s;
		dest[3] = a03 * c + a13 * s;

		dest[4] = a00 * -s + a10 * c;
		dest[5] = a01 * -s + a11 * c;
		dest[6] = a02 * -s + a12 * c;
		dest[7] = a03 * -s + a13 * c;

		return dest;
	};

	/**
	 * Generates a frustum matrix with the given bounds
	 *
	 * @param {number} left Left bound of the frustum
	 * @param {number} right Right bound of the frustum
	 * @param {number} bottom Bottom bound of the frustum
	 * @param {number} top Top bound of the frustum
	 * @param {number} near Near bound of the frustum
	 * @param {number} far Far bound of the frustum
	 * @param {mat4} [dest] mat4 frustum matrix will be written into
	 *
	 * @returns {mat4} dest if specified, a new mat4 otherwise
	 */
	mat4.frustum = function (left, right, bottom, top, near, far, dest) {
		if (!dest) { dest = mat4.create(); }
		var rl = (right - left),
			tb = (top - bottom),
			fn = (far - near);
		dest[0] = (near * 2) / rl;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		dest[4] = 0;
		dest[5] = (near * 2) / tb;
		dest[6] = 0;
		dest[7] = 0;
		dest[8] = (right + left) / rl;
		dest[9] = (top + bottom) / tb;
		dest[10] = -(far + near) / fn;
		dest[11] = -1;
		dest[12] = 0;
		dest[13] = 0;
		dest[14] = -(far * near * 2) / fn;
		dest[15] = 0;
		return dest;
	};

	/**
	 * Generates a perspective projection matrix with the given bounds
	 *
	 * @param {number} fovy Vertical field of view
	 * @param {number} aspect Aspect ratio. typically viewport width/height
	 * @param {number} near Near bound of the frustum
	 * @param {number} far Far bound of the frustum
	 * @param {mat4} [dest] mat4 frustum matrix will be written into
	 *
	 * @returns {mat4} dest if specified, a new mat4 otherwise
	 */
	mat4.perspective = function (fovy, aspect, near, far, dest) {
		var top = near * Math.tan(fovy * Math.PI / 360.0),
			right = top * aspect;
		return mat4.frustum(-right, right, -top, top, near, far, dest);
	};

	/**
	 * Generates a orthogonal projection matrix with the given bounds
	 *
	 * @param {number} left Left bound of the frustum
	 * @param {number} right Right bound of the frustum
	 * @param {number} bottom Bottom bound of the frustum
	 * @param {number} top Top bound of the frustum
	 * @param {number} near Near bound of the frustum
	 * @param {number} far Far bound of the frustum
	 * @param {mat4} [dest] mat4 frustum matrix will be written into
	 *
	 * @returns {mat4} dest if specified, a new mat4 otherwise
	 */
	mat4.ortho = function (left, right, bottom, top, near, far, dest) {
		if (!dest) { dest = mat4.create(); }
		var rl = (right - left),
			tb = (top - bottom),
			fn = (far - near);
		dest[0] = 2 / rl;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		dest[4] = 0;
		dest[5] = 2 / tb;
		dest[6] = 0;
		dest[7] = 0;
		dest[8] = 0;
		dest[9] = 0;
		dest[10] = -2 / fn;
		dest[11] = 0;
		dest[12] = -(left + right) / rl;
		dest[13] = -(top + bottom) / tb;
		dest[14] = -(far + near) / fn;
		dest[15] = 1;
		return dest;
	};

	/**
	 * Generates a look-at matrix with the given eye position, focal point, and up axis
	 *
	 * @param {vec3} eye Position of the viewer
	 * @param {vec3} center Point the viewer is looking at
	 * @param {vec3} up vec3 pointing "up"
	 * @param {mat4} [dest] mat4 frustum matrix will be written into
	 *
	 * @returns {mat4} dest if specified, a new mat4 otherwise
	 */
	mat4.lookAt = function (eye, center, up, dest) {
		if (!dest) { dest = mat4.create(); }

		var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
			eyex = eye[0],
			eyey = eye[1],
			eyez = eye[2],
			upx = up[0],
			upy = up[1],
			upz = up[2],
			centerx = center[0],
			centery = center[1],
			centerz = center[2];

		if (eyex === centerx && eyey === centery && eyez === centerz) {
			return mat4.identity(dest);
		}

		//vec3.direction(eye, center, z);
		z0 = eyex - centerx;
		z1 = eyey - centery;
		z2 = eyez - centerz;

		// normalize (no check needed for 0 because of early return)
		len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
		z0 *= len;
		z1 *= len;
		z2 *= len;

		//vec3.normalize(vec3.cross(up, z, x));
		x0 = upy * z2 - upz * z1;
		x1 = upz * z0 - upx * z2;
		x2 = upx * z1 - upy * z0;
		len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
		if (!len) {
			x0 = 0;
			x1 = 0;
			x2 = 0;
		} else {
			len = 1 / len;
			x0 *= len;
			x1 *= len;
			x2 *= len;
		}

		//vec3.normalize(vec3.cross(z, x, y));
		y0 = z1 * x2 - z2 * x1;
		y1 = z2 * x0 - z0 * x2;
		y2 = z0 * x1 - z1 * x0;

		len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
		if (!len) {
			y0 = 0;
			y1 = 0;
			y2 = 0;
		} else {
			len = 1 / len;
			y0 *= len;
			y1 *= len;
			y2 *= len;
		}

		dest[0] = x0;
		dest[1] = y0;
		dest[2] = z0;
		dest[3] = 0;
		dest[4] = x1;
		dest[5] = y1;
		dest[6] = z1;
		dest[7] = 0;
		dest[8] = x2;
		dest[9] = y2;
		dest[10] = z2;
		dest[11] = 0;
		dest[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
		dest[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
		dest[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
		dest[15] = 1;

		return dest;
	};

	/**
	 * Creates a matrix from a quaternion rotation and vector translation
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.translate(dest, vec);
	 *     var quatMat = mat4.create();
	 *     quat4.toMat4(quat, quatMat);
	 *     mat4.multiply(dest, quatMat);
	 *
	 * @param {quat4} quat Rotation quaternion
	 * @param {vec3} vec Translation vector
	 * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to a new mat4
	 *
	 * @returns {mat4} dest if specified, a new mat4 otherwise
	 */
	mat4.fromRotationTranslation = function (quat, vec, dest) {
		if (!dest) { dest = mat4.create(); }

		// Quaternion math
		var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
			x2 = x + x,
			y2 = y + y,
			z2 = z + z,

			xx = x * x2,
			xy = x * y2,
			xz = x * z2,
			yy = y * y2,
			yz = y * z2,
			zz = z * z2,
			wx = w * x2,
			wy = w * y2,
			wz = w * z2;

		dest[0] = 1 - (yy + zz);
		dest[1] = xy + wz;
		dest[2] = xz - wy;
		dest[3] = 0;
		dest[4] = xy - wz;
		dest[5] = 1 - (xx + zz);
		dest[6] = yz + wx;
		dest[7] = 0;
		dest[8] = xz + wy;
		dest[9] = yz - wx;
		dest[10] = 1 - (xx + yy);
		dest[11] = 0;
		dest[12] = vec[0];
		dest[13] = vec[1];
		dest[14] = vec[2];
		dest[15] = 1;

		return dest;
	};

	/**
	 * Returns a string representation of a mat4
	 *
	 * @param {mat4} mat mat4 to represent as a string
	 *
	 * @returns {string} String representation of mat
	 */
	mat4.str = function (mat) {
		return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] +
			', ' + mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] +
			', ' + mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] +
			', ' + mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
	};

	/*
 * quat4
 */

	/**
	 * Creates a new instance of a quat4 using the default array type
	 * Any javascript array containing at least 4 numeric elements can serve as a quat4
	 *
	 * @param {quat4} [quat] quat4 containing values to initialize with
	 *
	 * @returns {quat4} New quat4
	 */
	quat4.create = function (quat) {
		var dest = new MatrixArray(4);

		if (quat) {
			dest[0] = quat[0];
			dest[1] = quat[1];
			dest[2] = quat[2];
			dest[3] = quat[3];
		}

		return dest;
	};

	/**
	 * Copies the values of one quat4 to another
	 *
	 * @param {quat4} quat quat4 containing values to copy
	 * @param {quat4} dest quat4 receiving copied values
	 *
	 * @returns {quat4} dest
	 */
	quat4.set = function (quat, dest) {
		dest[0] = quat[0];
		dest[1] = quat[1];
		dest[2] = quat[2];
		dest[3] = quat[3];

		return dest;
	};

	/**
	 * Calculates the W component of a quat4 from the X, Y, and Z components.
	 * Assumes that quaternion is 1 unit in length.
	 * Any existing W component will be ignored.
	 *
	 * @param {quat4} quat quat4 to calculate W component of
	 * @param {quat4} [dest] quat4 receiving calculated values. If not specified result is written to quat
	 *
	 * @returns {quat4} dest if specified, quat otherwise
	 */
	quat4.calculateW = function (quat, dest) {
		var x = quat[0], y = quat[1], z = quat[2];

		if (!dest || quat === dest) {
			quat[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
			return quat;
		}
		dest[0] = x;
		dest[1] = y;
		dest[2] = z;
		dest[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
		return dest;
	};

	/**
	 * Calculates the dot product of two quaternions
	 *
	 * @param {quat4} quat First operand
	 * @param {quat4} quat2 Second operand
	 *
	 * @return {number} Dot product of quat and quat2
	 */
	quat4.dot = function(quat, quat2){
		return quat[0]*quat2[0] + quat[1]*quat2[1] + quat[2]*quat2[2] + quat[3]*quat2[3];
	};

	/**
	 * Calculates the inverse of a quat4
	 *
	 * @param {quat4} quat quat4 to calculate inverse of
	 * @param {quat4} [dest] quat4 receiving inverse values. If not specified result is written to quat
	 *
	 * @returns {quat4} dest if specified, quat otherwise
	 */
	quat4.inverse = function(quat, dest) {
		var q0 = quat[0], q1 = quat[1], q2 = quat[2], q3 = quat[3],
			dot = q0*q0 + q1*q1 + q2*q2 + q3*q3,
			invDot = dot ? 1.0/dot : 0;

		// TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

		if(!dest || quat === dest) {
			quat[0] *= -invDot;
			quat[1] *= -invDot;
			quat[2] *= -invDot;
			quat[3] *= invDot;
			return quat;
		}
		dest[0] = -quat[0]*invDot;
		dest[1] = -quat[1]*invDot;
		dest[2] = -quat[2]*invDot;
		dest[3] = quat[3]*invDot;
		return dest;
	};


	/**
	 * Calculates the conjugate of a quat4
	 * If the quaternion is normalized, this function is faster than quat4.inverse and produces the same result.
	 *
	 * @param {quat4} quat quat4 to calculate conjugate of
	 * @param {quat4} [dest] quat4 receiving conjugate values. If not specified result is written to quat
	 *
	 * @returns {quat4} dest if specified, quat otherwise
	 */
	quat4.conjugate = function (quat, dest) {
		if (!dest || quat === dest) {
			quat[0] *= -1;
			quat[1] *= -1;
			quat[2] *= -1;
			return quat;
		}
		dest[0] = -quat[0];
		dest[1] = -quat[1];
		dest[2] = -quat[2];
		dest[3] = quat[3];
		return dest;
	};

	/**
	 * Calculates the length of a quat4
	 *
	 * Params:
	 * @param {quat4} quat quat4 to calculate length of
	 *
	 * @returns Length of quat
	 */
	quat4.length = function (quat) {
		var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
		return Math.sqrt(x * x + y * y + z * z + w * w);
	};

	/**
	 * Generates a unit quaternion of the same direction as the provided quat4
	 * If quaternion length is 0, returns [0, 0, 0, 0]
	 *
	 * @param {quat4} quat quat4 to normalize
	 * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
	 *
	 * @returns {quat4} dest if specified, quat otherwise
	 */
	quat4.normalize = function (quat, dest) {
		if (!dest) { dest = quat; }

		var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
			len = Math.sqrt(x * x + y * y + z * z + w * w);
		if (len === 0) {
			dest[0] = 0;
			dest[1] = 0;
			dest[2] = 0;
			dest[3] = 0;
			return dest;
		}
		len = 1 / len;
		dest[0] = x * len;
		dest[1] = y * len;
		dest[2] = z * len;
		dest[3] = w * len;

		return dest;
	};

	/**
	 * Performs a quaternion multiplication
	 *
	 * @param {quat4} quat First operand
	 * @param {quat4} quat2 Second operand
	 * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
	 *
	 * @returns {quat4} dest if specified, quat otherwise
	 */
	quat4.multiply = function (quat, quat2, dest) {
		if (!dest) { dest = quat; }

		var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3],
			qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];

		dest[0] = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
		dest[1] = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
		dest[2] = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
		dest[3] = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

		return dest;
	};

	/**
	 * Transforms a vec3 with the given quaternion
	 *
	 * @param {quat4} quat quat4 to transform the vector with
	 * @param {vec3} vec vec3 to transform
	 * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
	 *
	 * @returns dest if specified, vec otherwise
	 */
	quat4.multiplyVec3 = function (quat, vec, dest) {
		if (!dest) { dest = vec; }

		var x = vec[0], y = vec[1], z = vec[2],
			qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3],

			// calculate quat * vec
			ix = qw * x + qy * z - qz * y,
			iy = qw * y + qz * x - qx * z,
			iz = qw * z + qx * y - qy * x,
			iw = -qx * x - qy * y - qz * z;

		// calculate result * inverse quat
		dest[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
		dest[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
		dest[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

		return dest;
	};

	/**
	 * Calculates a 3x3 matrix from the given quat4
	 *
	 * @param {quat4} quat quat4 to create matrix from
	 * @param {mat3} [dest] mat3 receiving operation result
	 *
	 * @returns {mat3} dest if specified, a new mat3 otherwise
	 */
	quat4.toMat3 = function (quat, dest) {
		if (!dest) { dest = mat3.create(); }

		var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
			x2 = x + x,
			y2 = y + y,
			z2 = z + z,

			xx = x * x2,
			xy = x * y2,
			xz = x * z2,
			yy = y * y2,
			yz = y * z2,
			zz = z * z2,
			wx = w * x2,
			wy = w * y2,
			wz = w * z2;

		dest[0] = 1 - (yy + zz);
		dest[1] = xy + wz;
		dest[2] = xz - wy;

		dest[3] = xy - wz;
		dest[4] = 1 - (xx + zz);
		dest[5] = yz + wx;

		dest[6] = xz + wy;
		dest[7] = yz - wx;
		dest[8] = 1 - (xx + yy);

		return dest;
	};

	/**
	 * Calculates a 4x4 matrix from the given quat4
	 *
	 * @param {quat4} quat quat4 to create matrix from
	 * @param {mat4} [dest] mat4 receiving operation result
	 *
	 * @returns {mat4} dest if specified, a new mat4 otherwise
	 */
	quat4.toMat4 = function (quat, dest) {
		if (!dest) { dest = mat4.create(); }

		var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
			x2 = x + x,
			y2 = y + y,
			z2 = z + z,

			xx = x * x2,
			xy = x * y2,
			xz = x * z2,
			yy = y * y2,
			yz = y * z2,
			zz = z * z2,
			wx = w * x2,
			wy = w * y2,
			wz = w * z2;

		dest[0] = 1 - (yy + zz);
		dest[1] = xy + wz;
		dest[2] = xz - wy;
		dest[3] = 0;

		dest[4] = xy - wz;
		dest[5] = 1 - (xx + zz);
		dest[6] = yz + wx;
		dest[7] = 0;

		dest[8] = xz + wy;
		dest[9] = yz - wx;
		dest[10] = 1 - (xx + yy);
		dest[11] = 0;

		dest[12] = 0;
		dest[13] = 0;
		dest[14] = 0;
		dest[15] = 1;

		return dest;
	};

	/**
	 * Performs a spherical linear interpolation between two quat4
	 *
	 * @param {quat4} quat First quaternion
	 * @param {quat4} quat2 Second quaternion
	 * @param {number} slerp Interpolation amount between the two inputs
	 * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
	 *
	 * @returns {quat4} dest if specified, quat otherwise
	 */
	quat4.slerp = function (quat, quat2, slerp, dest) {
		if (!dest) { dest = quat; }

		var cosHalfTheta = quat[0] * quat2[0] + quat[1] * quat2[1] + quat[2] * quat2[2] + quat[3] * quat2[3],
			halfTheta,
			sinHalfTheta,
			ratioA,
			ratioB;

		if (Math.abs(cosHalfTheta) >= 1.0) {
			if (dest !== quat) {
				dest[0] = quat[0];
				dest[1] = quat[1];
				dest[2] = quat[2];
				dest[3] = quat[3];
			}
			return dest;
		}

		halfTheta = Math.acos(cosHalfTheta);
		sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

		if (Math.abs(sinHalfTheta) < 0.001) {
			dest[0] = (quat[0] * 0.5 + quat2[0] * 0.5);
			dest[1] = (quat[1] * 0.5 + quat2[1] * 0.5);
			dest[2] = (quat[2] * 0.5 + quat2[2] * 0.5);
			dest[3] = (quat[3] * 0.5 + quat2[3] * 0.5);
			return dest;
		}

		ratioA = Math.sin((1 - slerp) * halfTheta) / sinHalfTheta;
		ratioB = Math.sin(slerp * halfTheta) / sinHalfTheta;

		dest[0] = (quat[0] * ratioA + quat2[0] * ratioB);
		dest[1] = (quat[1] * ratioA + quat2[1] * ratioB);
		dest[2] = (quat[2] * ratioA + quat2[2] * ratioB);
		dest[3] = (quat[3] * ratioA + quat2[3] * ratioB);

		return dest;
	};

	/**
	 * Returns a string representation of a quaternion
	 *
	 * @param {quat4} quat quat4 to represent as a string
	 *
	 * @returns {string} String representation of quat
	 */
	quat4.str = function (quat) {
		return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']';
	};


// src/filters/common.js
	function warpShader(uniforms, warp) {
		return new Shader(null, uniforms + '\
    uniform sampler2D texture;\
    uniform vec2 texSize;\
    varying vec2 texCoord;\
    void main() {\
        vec2 coord = texCoord * texSize;\
        ' + warp + '\
        gl_FragColor = texture2D(texture, coord / texSize);\
        vec2 clampedCoord = clamp(coord, vec2(0.0), texSize);\
        if (coord != clampedCoord) {\
            /* fade to transparent black if we are outside the image */\
            gl_FragColor *= max(0.0, 1.0 - length(coord - clampedCoord));\
        }\
    }');
	}

// returns a random number between 0 and 1
	var randomShaderFunc = '\
    float random(vec3 scale, float seed) {\
        /* use the fragment position for a different seed per-pixel */\
        return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\
    }\
';

// src/filters/blur/localcontrast.js
	/**
	 * @filter       Fast Blur
	 * @description  This is the most basic blur filter, which convolves the image with a
	 *               pyramid filter. The pyramid filter is separable and is applied as two
	 *               perpendicular triangle filters.
	 * @param radius The radius of the pyramid convolved with the image.
	 */
	function localContrast(radius,strength) {
		gl.localContrastMin = gl.localContrastMin || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = vec4(1.0);\
            color=min(color,texture2D(texture, texCoord         ));\
            color=min(color,texture2D(texture, texCoord + delta * vec2( 1.,0.) ));\
            color=min(color,texture2D(texture, texCoord + delta * vec2(-1.,0.) ));\
            color=min(color,texture2D(texture, texCoord + delta * vec2(0., 1.) ));\
            color=min(color,texture2D(texture, texCoord + delta * vec2(0.,-1.) ));\
            gl_FragColor = color; \
        }\
    ');
		gl.localContrastMax = gl.localContrastMax || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = vec4(0.0);\
            color=max(color,texture2D(texture, texCoord         ));\
            color=max(color,texture2D(texture, texCoord + delta * vec2( 1.,0.) ));\
            color=max(color,texture2D(texture, texCoord + delta * vec2(-1.,0.) ));\
            color=max(color,texture2D(texture, texCoord + delta * vec2(0., 1.) ));\
            color=max(color,texture2D(texture, texCoord + delta * vec2(0.,-1.) ));\
            gl_FragColor = color; \
        }\
    ');
		gl.localContrast = gl.localContrast || new Shader(null, '\
        uniform sampler2D texture;\
        uniform sampler2D min_texture;\
        uniform sampler2D max_texture;\
        uniform float strength; \
        varying vec2 texCoord;\
        void main() {\
            vec3 color    =texture2D(texture    ,texCoord).rgb; \
            vec3 min_color=texture2D(min_texture,texCoord).rgb; \
            vec3 max_color=texture2D(max_texture,texCoord).rgb; \
            vec3 contrast_color=(color-min_color)/(max_color-min_color);\
            gl_FragColor = vec4(mix(color,contrast_color,strength),1.); \
        }\
    ');


		// save current image to stack
		var original_image=this.stack_push();

		this.fastBlur(radius);
		var min_image=this.stack_push();
		var max_image=this.stack_push();

		var steps=radius/2;
		var delta=Math.sqrt(radius);

		for(var i=0; i<steps; i++)
			simpleShader.call(this, gl.localContrastMin, { delta: [delta/this.width, delta/this.height]}, min_image, min_image);

		for(var i=0; i<steps; i++)
			simpleShader.call(this, gl.localContrastMax, { delta: [delta/this.width, delta/this.height]},max_image, max_image);


		min_image.use(1);
		max_image.use(2);
		gl.localContrast.textures({min_texture:1, max_texture:2});
		simpleShader.call(this, gl.localContrast, {strength:strength},original_image);

		this.stack_pop();
		this.stack_pop();
		this.stack_pop();

		return this;
	}


// src/filters/blur/zoomblur.js
	/**
	 * @filter         Zoom Blur
	 * @description    Blurs the image away from a certain point, which looks like radial motion blur.
	 * @param centerX  The x coordinate of the blur origin.
	 * @param centerY  The y coordinate of the blur origin.
	 * @param strength The strength of the blur. Values in the range 0 to 1 are usually sufficient,
	 *                 where 0 doesn't change the image and 1 creates a highly blurred image.
	 */
	function zoomBlur(centerX, centerY, strength) {
		gl.zoomBlur = gl.zoomBlur || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float strength;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        void main() {\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            vec2 toCenter = center - texCoord * texSize;\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = 0.0; t <= 40.0; t++) {\
                float percent = (t + offset) / 40.0;\
                float weight = 4.0 * (percent - percent * percent);\
                vec4 sample = texture2D(texture, texCoord + toCenter * percent * strength / texSize);\
                \
                /* switch to pre-multiplied alpha to correctly blur transparent images */\
                sample.rgb *= sample.a;\
                \
                color += sample * weight;\
                total += weight;\
            }\
            \
            gl_FragColor = color / total;\
            \
            /* switch back from pre-multiplied alpha */\
            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;\
        }\
    ');

		simpleShader.call(this, gl.zoomBlur, {
			center: [centerX, centerY],
			strength: strength,
			texSize: [this.width, this.height]
		});

		return this;
	}

// src/filters/blur/dilate.js
	function dilate(iterations) {
		gl.dilate = gl.dilate || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() \
        {\
          vec4 col = vec4(0.,0.,0.,1.);\
          for(int xoffset = -1; xoffset <= 1; xoffset++)\
          {\
	          for(int yoffset = -1; yoffset <= 1; yoffset++)\
	          {\
		          vec2 offset = vec2(xoffset,yoffset);\
		          col = max(col,texture2D(texture,texCoord+offset/texSize));\
	          }\
          }\
          gl_FragColor = clamp(col,vec4(0.),vec4(1.));\
        }\
    ');

		for(var i=0; i<iterations; i++)
			simpleShader.call(this, gl.dilate, {texSize: [this.width, this.height]});

		return this;
	}

// src/filters/blur/erode.js
	function erode(iterations) {
		gl.erode = gl.erode || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() \
        {\
          vec4 col = vec4(1);\
          for(int xoffset = -1; xoffset <= 1; xoffset++)\
          {\
	          for(int yoffset = -1; yoffset <= 1; yoffset++)\
	          {\
		          vec2 offset = vec2(xoffset,yoffset);\
		          col = min(col,texture2D(texture,texCoord+offset/texSize));\
	          }\
          }\
          gl_FragColor = clamp(col,vec4(0.),vec4(1.));\
        }\
    ');

		for(var i=0; i<iterations; i++)
			simpleShader.call(this, gl.erode, {texSize: [this.width, this.height]});

		return this;
	}

// src/filters/blur/lensblur.js
	/**
	 * @filter           Lens Blur
	 * @description      Imitates a camera capturing the image out of focus by using a blur that generates
	 *                   the large shapes known as bokeh. The polygonal shape of real bokeh is due to the
	 *                   blades of the aperture diaphragm when it isn't fully open. This blur renders
	 *                   bokeh from a 6-bladed diaphragm because the computation is more efficient. It
	 *                   can be separated into three rhombi, each of which is just a skewed box blur.
	 *                   This filter makes use of the floating point texture WebGL extension to implement
	 *                   the brightness parameter, so there will be severe visual artifacts if brightness
	 *                   is non-zero and the floating point texture extension is not available. The
	 *                   idea was from John White's SIGGRAPH 2011 talk but this effect has an additional
	 *                   brightness parameter that fakes what would otherwise come from a HDR source.
	 * @param radius     the radius of the hexagonal disk convolved with the image
	 * @param brightness -1 to 1 (the brightness of the bokeh, negative values will create dark bokeh)
	 * @param angle      the rotation of the bokeh in radians
	 */
	function lensBlur(radius, brightness, angle) {
		// All averaging is done on values raised to a power to make more obvious bokeh
		// (we will raise the average to the inverse power at the end to compensate).
		// Without this the image looks almost like a normal blurred image. This hack is
		// obviously not realistic, but to accurately simulate this we would need a high
		// dynamic range source photograph which we don't have.
		gl.lensBlurPrePass = gl.lensBlurPrePass || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float power;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            color = pow(color, vec4(power));\
            gl_FragColor = vec4(color);\
        }\
    ');

		var common = '\
        uniform sampler2D texture0;\
        uniform sampler2D texture1;\
        uniform vec2 delta0;\
        uniform vec2 delta1;\
        uniform float power;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        vec4 sample(vec2 delta) {\
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(delta, 151.7182), 0.0);\
            \
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            for (float t = 0.0; t <= 30.0; t++) {\
                float percent = (t + offset) / 30.0;\
                color += texture2D(texture0, texCoord + delta * percent);\
                total += 1.0;\
            }\
            return color / total;\
        }\
    ';

		gl.lensBlur0 = gl.lensBlur0 || new Shader(null, common + '\
        void main() {\
            gl_FragColor = sample(delta0);\
        }\
    ');
		gl.lensBlur1 = gl.lensBlur1 || new Shader(null, common + '\
        void main() {\
            gl_FragColor = (sample(delta0) + sample(delta1)) * 0.5;\
        }\
    ');
		gl.lensBlur2 = gl.lensBlur2 || new Shader(null, common + '\
        void main() {\
            vec4 color = (sample(delta0) + 2.0 * texture2D(texture1, texCoord)) / 3.0;\
            gl_FragColor = pow(color, vec4(power));\
        }\
    ').textures({ texture1: 1 });

		// Generate
		var dir = [];
		for (var i = 0; i < 3; i++) {
			var a = angle + i * Math.PI * 2 / 3;
			dir.push([radius * Math.sin(a) / this.width, radius * Math.cos(a) / this.height]);
		}
		var power = Math.pow(10, clamp(-1, brightness, 1));

		// Remap the texture values, which will help make the bokeh effect
		simpleShader.call(this, gl.lensBlurPrePass, {
			power: power
		});

		// Blur two rhombi in parallel into extraTexture
		this._.extraTexture.ensureFormat(this._.texture);
		simpleShader.call(this, gl.lensBlur0, {
			delta0: dir[0]
		}, this._.texture, this._.extraTexture);
		simpleShader.call(this, gl.lensBlur1, {
			delta0: dir[1],
			delta1: dir[2]
		}, this._.extraTexture, this._.extraTexture);

		// Blur the last rhombus and combine with extraTexture
		simpleShader.call(this, gl.lensBlur0, {
			delta0: dir[1]
		});
		this._.extraTexture.use(1);
		simpleShader.call(this, gl.lensBlur2, {
			power: 1 / power,
			delta0: dir[2]
		});

		return this;
	}

// src/filters/blur/triangleblur.js
	/**
	 * @filter       Triangle Blur
	 * @description  This is the most basic blur filter, which convolves the image with a
	 *               pyramid filter. The pyramid filter is separable and is applied as two
	 *               perpendicular triangle filters.
	 * @param radius The radius of the pyramid convolved with the image.
	 */
	function triangleBlur(radius) {
		gl.triangleBlur = gl.triangleBlur || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        void main() {\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec4 sample = texture2D(texture, texCoord + delta * percent);\
                \
                /* switch to pre-multiplied alpha to correctly blur transparent images */\
                sample.rgb *= sample.a;\
                \
                color += sample * weight;\
                total += weight;\
            }\
            \
            gl_FragColor = color / total;\
            \
            /* switch back from pre-multiplied alpha */\
            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;\
        }\
    ');

		simpleShader.call(this, gl.triangleBlur, {
			delta: [radius / this.width, 0]
		});
		simpleShader.call(this, gl.triangleBlur, {
			delta: [0, radius / this.height]
		});

		return this;
	}

// src/filters/blur/fastblur.js
	function fastBlur(radius) {
		gl.fastBlur = gl.fastBlur || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = vec4(0.0);\
            float b=1./4.;\
            color+=b*texture2D(texture, texCoord + delta * vec2( .5, .5) );\
            color+=b*texture2D(texture, texCoord + delta * vec2(-.5, .5) );\
            color+=b*texture2D(texture, texCoord + delta * vec2( .5,-.5) );\
            color+=b*texture2D(texture, texCoord + delta * vec2(-.5,-.5) );\
            gl_FragColor = color; \
        }\
    ');

		for(var d=1.; d<=radius; d*=Math.sqrt(2))
		{
			simpleShader.call(this, gl.fastBlur, { delta: [d/this.width, d/this.height]});
		}
		return this;
	}

// src/filters/blur/tiltshift.js
	/**
	 * @filter               Tilt Shift
	 * @description          Simulates the shallow depth of field normally encountered in close-up
	 *                       photography, which makes the scene seem much smaller than it actually
	 *                       is. This filter assumes the scene is relatively planar, in which case
	 *                       the part of the scene that is completely in focus can be described by
	 *                       a line (the intersection of the focal plane and the scene). An example
	 *                       of a planar scene might be looking at a road from above at a downward
	 *                       angle. The image is then blurred with a blur radius that starts at zero
	 *                       on the line and increases further from the line.
	 * @param startX         The x coordinate of the start of the line segment.
	 * @param startY         The y coordinate of the start of the line segment.
	 * @param endX           The x coordinate of the end of the line segment.
	 * @param endY           The y coordinate of the end of the line segment.
	 * @param blurRadius     The maximum radius of the pyramid blur.
	 * @param gradientRadius The distance from the line at which the maximum blur radius is reached.
	 */
	function tiltShift(startX, startY, endX, endY, blurRadius, gradientRadius) {
		gl.tiltShift = gl.tiltShift || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float blurRadius;\
        uniform float gradientRadius;\
        uniform vec2 start;\
        uniform vec2 end;\
        uniform vec2 delta;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        void main() {\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            vec2 normal = normalize(vec2(start.y - end.y, end.x - start.x));\
            float radius = smoothstep(0.0, 1.0, abs(dot(texCoord * texSize - start, normal)) / gradientRadius) * blurRadius;\
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec4 sample = texture2D(texture, texCoord + delta / texSize * percent * radius);\
                \
                /* switch to pre-multiplied alpha to correctly blur transparent images */\
                sample.rgb *= sample.a;\
                \
                color += sample * weight;\
                total += weight;\
            }\
            \
            gl_FragColor = color / total;\
            \
            /* switch back from pre-multiplied alpha */\
            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;\
        }\
    ');

		var dx = endX - startX;
		var dy = endY - startY;
		var d = Math.sqrt(dx * dx + dy * dy);
		simpleShader.call(this, gl.tiltShift, {
			blurRadius: blurRadius,
			gradientRadius: gradientRadius,
			start: [startX, startY],
			end: [endX, endY],
			delta: [dx / d, dy / d],
			texSize: [this.width, this.height]
		});
		simpleShader.call(this, gl.tiltShift, {
			blurRadius: blurRadius,
			gradientRadius: gradientRadius,
			start: [startX, startY],
			end: [endX, endY],
			delta: [-dy / d, dx / d],
			texSize: [this.width, this.height]
		});

		return this;
	}

// src/filters/warp/swirl.js
	/**
	 * @filter        Swirl
	 * @description   Warps a circular region of the image in a swirl.
	 * @param centerX The x coordinate of the center of the circular region.
	 * @param centerY The y coordinate of the center of the circular region.
	 * @param radius  The radius of the circular region.
	 * @param angle   The angle in radians that the pixels in the center of
	 *                the circular region will be rotated by.
	 */
	function swirl(centerX, centerY, radius, angle) {
		gl.swirl = gl.swirl || warpShader('\
        uniform float radius;\
        uniform float angle;\
        uniform vec2 center;\
    ', '\
        coord -= center;\
        float distance = length(coord);\
        if (distance < radius) {\
            float percent = (radius - distance) / radius;\
            float theta = percent * percent * angle;\
            float s = sin(theta);\
            float c = cos(theta);\
            coord = vec2(\
                coord.x * c - coord.y * s,\
                coord.x * s + coord.y * c\
            );\
        }\
        coord += center;\
    ');

		simpleShader.call(this, gl.swirl, {
			radius: radius,
			center: [centerX, centerY],
			angle: angle,
			texSize: [this.width, this.height]
		});

		return this;
	}

// src/filters/warp/matrixwarp.js
	/**
	 * @filter                Matrix Warp
	 * @description           Transforms an image by a 2x2 or 3x3 matrix. The coordinates used in
	 *                        the transformation are (x, y) for a 2x2 matrix or (x, y, 1) for a
	 *                        3x3 matrix, where x and y are in units of pixels.
	 * @param matrix          A 2x2 or 3x3 matrix represented as either a list or a list of lists.
	 *                        For example, the 3x3 matrix [[2,0,0],[0,3,0],[0,0,1]] can also be
	 *                        represented as [2,0,0,0,3,0,0,0,1] or just [2,0,0,3].
	 * @param inverse         A boolean value that, when true, applies the inverse transformation
	 *                        instead. (optional, defaults to false)
	 * @param useTextureSpace A boolean value that, when true, uses texture-space coordinates
	 *                        instead of screen-space coordinates. Texture-space coordinates range
	 *                        from -1 to 1 instead of 0 to width - 1 or height - 1, and are easier
	 *                        to use for simple operations like flipping and rotating.
	 */
	function matrixWarp(matrix, inverse, useTextureSpace) {
		gl.matrixWarp = gl.matrixWarp || warpShader('\
        uniform mat3 matrix;\
        uniform float useTextureSpace;\
    ', '\
        if (useTextureSpace>0.) coord = coord / texSize * 2.0 - 1.0;\
        vec3 warp = matrix * vec3(coord, 1.0);\
        coord = warp.xy / warp.z;\
        if (useTextureSpace>0.) coord = (coord * 0.5 + 0.5) * texSize;\
    ');

		// Flatten all members of matrix into one big list
		matrix = Array.prototype.concat.apply([], matrix);

		// Extract a 3x3 matrix out of the arguments
		if (matrix.length == 4) {
			matrix = [
				matrix[0], matrix[1], 0,
				matrix[2], matrix[3], 0,
				0, 0, 1
			];
		} else if (matrix.length != 9) {
			throw 'can only warp with 2x2 or 3x3 matrix';
		}

		simpleShader.call(this, gl.matrixWarp, {
			matrix: inverse ? getInverse(matrix) : matrix,
			texSize: [this.width, this.height],
			useTextureSpace: useTextureSpace | 0
		});

		return this;
	}

// src/filters/warp/perspective.js
	/**
	 * @filter       Perspective
	 * @description  Warps one quadrangle to another with a perspective transform. This can be used to
	 *               make a 2D image look 3D or to recover a 2D image captured in a 3D environment.
	 * @param before The x and y coordinates of four points before the transform in a flat list. This
	 *               would look like [ax, ay, bx, by, cx, cy, dx, dy] for four points (ax, ay), (bx, by),
	 *               (cx, cy), and (dx, dy).
	 * @param after  The x and y coordinates of four points after the transform in a flat list, just
	 *               like the other argument.
	 */
	function perspective(before, after,use_texture_space) {
		var a = getSquareToQuad.apply(null, after);
		var b = getSquareToQuad.apply(null, before);
		var c = multiply(getInverse(a), b);
		return this.matrixWarp(c,false,use_texture_space);
	}

// src/filters/warp/bulgepinch.js
	/**
	 * @filter         Bulge / Pinch
	 * @description    Bulges or pinches the image in a circle.
	 * @param centerX  The x coordinate of the center of the circle of effect.
	 * @param centerY  The y coordinate of the center of the circle of effect.
	 * @param radius   The radius of the circle of effect.
	 * @param strength -1 to 1 (-1 is strong pinch, 0 is no effect, 1 is strong bulge)
	 */
	function bulgePinch(centerX, centerY, radius, strength) {
		gl.bulgePinch = gl.bulgePinch || warpShader('\
        uniform float radius;\
        uniform float strength;\
        uniform vec2 center;\
    ', '\
        coord -= center;\
        float distance = length(coord);\
        if (distance < radius) {\
            float percent = distance / radius;\
            if (strength > 0.0) {\
                coord *= mix(1.0, smoothstep(0.0, radius / distance, percent), strength * 0.75);\
            } else {\
                coord *= mix(1.0, pow(percent, 1.0 + strength * 0.75) * radius / distance, 1.0 - percent);\
            }\
        }\
        coord += center;\
    ');

		simpleShader.call(this, gl.bulgePinch, {
			radius: radius,
			strength: clamp(-1, strength, 1),
			center: [centerX, centerY],
			texSize: [this.width, this.height]
		});

		return this;
	}

// src/filters/video/gauze.js
	function gauze(fx,fy,angle,amplitude,x,y) {

		gl.gauze = gl.gauze || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float amplitude;\
        uniform vec4 xform;\
        uniform vec2 center;\
        varying vec2 texCoord;\
        mat2 mat=mat2(xform.xy,xform.zw);\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            vec2 sines=sin(mat*(texCoord-center));\
            float a=1.+amplitude*(sines.x+sines.y);\
            gl_FragColor = color*a;\
        }\
    ');

		simpleShader.call(this, gl.gauze, {
			xform: [
				Math.cos(angle)*fx, Math.sin(angle)*fy,
				-Math.sin(angle)*fx, Math.cos(angle)*fy
			],
			amplitude: amplitude,
			center: [x-this.width/2,y-this.height/2], // TODO remove this fix to cope with UI values top-left origin
			texSize: [this.width, this.height]
		});

		return this;
	}


// src/filters/video/lumakey.js
	function lumakey(threshold,feather) {
		gl.lumakey = gl.lumakey || new Shader(null, '\
      uniform sampler2D texture;\
      uniform sampler2D texture1;\
      uniform float threshold;\
      uniform float feather;\
      varying vec2 texCoord;\
      void main() {\
        vec4 color  = texture2D(texture , texCoord);\
        vec4 color1 = texture2D(texture1, texCoord);\
        float d=dot(color.rgb,vec3(1./3.)); \
        float alpha=clamp((d - threshold) / feather, 0.0, 1.0); \
        gl_FragColor = mix(color1, color, alpha);\
      }\
    ');

		var texture1=this.stack_pop();
		texture1.use(1);
		gl.lumakey.textures({texture: 0, texture1: 1});
		simpleShader.call(this, gl.lumakey, { threshold: threshold, feather: feather });
		texture1.unuse(1);

		return this;
	}

// src/filters/video/grid.js
	/**
	 * @filter         Grid
	 * @description    Adds a grid to the image
	 */
	function grid(size, angle) {
		gl.grid = gl.grid || new Shader(null, '\
        uniform sampler2D texture;\
      	uniform float size;\
      	uniform float angle;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            vec2 uv=texCoord*vec2(size,size);\
            uv=vec2(cos(angle)*uv.x+sin(angle)*uv.y,-sin(angle)*uv.x+cos(angle)*uv.y);\
            \
            if     (fract(uv.x*8.+.02)<.04 || fract(uv.y*8.+.02)<.04)\
	            gl_FragColor = vec4(0.0,0.0,0.0,1.0);\
            else if(fract(uv.x*8.+.05)<.1 || fract(uv.y*8.+.05)<.1)\
	            gl_FragColor = vec4(1.0,1.0,1.0,1.0);\
            else\
	            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.grid, {size: size, angle:angle
		});

		return this;
	}

// src/filters/video/kaleidoscope.js
	function kaleidoscope(sides,angle,angle2) {
		gl.kaleidoscope = gl.kaleidoscope || new Shader(null, '\
        uniform sampler2D texture;\
	uniform float angle;\
	uniform float angle2;\
	uniform float sides;\
        varying vec2 texCoord;\
	void main() {\
		vec2 p = texCoord - 0.5;\
		float r = length(p);\
		float a = atan(p.y, p.x) + angle;\
		float tau = 2. * 3.1416 ;\
		a = mod(a, tau/sides);\
		a = abs(a - tau/sides/2.) * 1.5 ;\
		p = r * 2. * vec2(cos(a+angle2), sin(a+angle2));\
		vec4 color = texture2D(texture, mod(p + 0.5,vec2(1.,1.)));\
		gl_FragColor = color;\
	}\
    ');

		simpleShader.call(this, gl.kaleidoscope, {sides:Math.round(sides), angle:angle, angle2:angle2});

		return this;
	}


// src/filters/video/noalpha.js
	function noalpha() {
		gl.noalpha = gl.noalpha || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            gl_FragColor = vec4(color.rgb,1.);\
        }\
    ');
		simpleShader.call(this, gl.noalpha, {});
		return this;
	}

// src/filters/video/blend.js
	function blend(alpha,factor) {
		gl.blend = gl.blend || new Shader(null, '\
        uniform sampler2D texture;\
        uniform sampler2D texture1;\
        uniform float alpha;\
        uniform float factor;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color  = texture2D(texture , texCoord);\
            vec4 color1 = texture2D(texture1, texCoord);\
            gl_FragColor = mix(color, color1, alpha) * factor;\
        }\
    ');

		var texture1=this.stack_pop();
		texture1.use(1);
		gl.blend.textures({texture: 0, texture1: 1});
		simpleShader.call(this, gl.blend, { alpha: alpha, factor: factor ? factor : 1.0 });
		texture1.unuse(1);

		return this;
	}

// src/filters/video/superquadric.js
	function superquadric(A,B,C,r,s,t,angle) {
		gl.superquadric = gl.superquadric || new Shader('\
    attribute vec3 vertex;\
    attribute vec2 _texCoord;\
    varying vec2 texCoord;\
    uniform mat4 matrix;\
    void main() {\
        texCoord = _texCoord;\
        vec4 pos=matrix * (vec4(vertex,1.0));  \
        gl_Position = pos/pos.w; \
    }','\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
          vec4 rgba = texture2D(texture, texCoord);\
          gl_FragColor = rgba;\
        }\
    ');

		function superquadric_p(u,v,A,B,C,r,s,t) {
			// parametric equations for superquadric, from http://en.wikipedia.org/wiki/Superquadrics
			//   with respect to surface lat-lon params (u,v)
			//   having scaling values along shape x,y,z axes (A,B,C)
			//   and shape definition exponents along shape x,y,z axes (r,s,t)
			//
			//   x(u,v) = A*c(v,2/r)*c(u,2/r)
			//   y(u,v) = B*c(v,2/s)*s(u,2/s)
			//   z(u,v) = C*s(v,2/t)
			//
			// aux functions
			//   c(w,m) = sgn(cos(w))*abs(cos(w))^m
			//   s(w,m) = sgn(sin(w))*abs(sin(w))^m
			var point = [];
			point.x = A*superquadric_c(v,2/r)*superquadric_c(u,2/r);
			point.y = B*superquadric_c(v,2/s)*superquadric_s(u,2/s);
			point.z = C*superquadric_s(v,2/t);
			return point;
		}
		function superquadric_c(w,m) {
			if (typeof Math.sign !== 'undefined')
				return Math.sign(Math.cos(w))*Math.pow(Math.abs(Math.cos(w)),m);
			else
				return Math_sign(Math.cos(w))*Math.pow(Math.abs(Math.cos(w)),m);
			// why does Chrome not have Math.sign(); that seems unwise
		}
		function superquadric_s(w,m) {
			if (typeof Math.sign !== 'undefined')
				return Math.sign(Math.sin(w))*Math.pow(Math.abs(Math.sin(w)),m);
			else
				return Math_sign(Math.sin(w))*Math.pow(Math.abs(Math.sin(w)),m);
			// why does Chrome not have Math.sign(); that seems unwise
		}
		function Math_sign(a) {
			if (a < 0) return -1;
			else if (a > 0) return 1;
			else return 0;
		}



		var vertices=[];
		var uvs=[];










		// squad = [];
		// squad.scaling = {A:1, B:1, C:1};
		//squad.shape = {r:2, s:2, t:2};  // start as sphere
		//squad.shape = {r:10, s:10, t:10};  // start as rounded cube
		//squad.shape = {r:0.6, s:0.6, t:0.6};  // my favorite
		for (sv=-Math.PI/2,i=0;sv<=Math.PI/2;sv+=Math.PI/25,i++) {
			for (su=-Math.PI,j=0;su<=Math.PI;su+=Math.PI/50,j++) {

				var u=su/Math.PI/2+0.5;
				var v=sv/Math.PI+0.5;

				var sv2=sv-Math.PI/25;
				var v2=sv2/Math.PI+0.5;

				var p1 = superquadric_p(su,sv,A,B,C,r,s,t);
				vertices.push(p1.x,p1.z,p1.y);
				uvs.push(u,v);

				var p2 = superquadric_p(su,sv2,A,B,C,r,s,t);
				vertices.push(p2.x,p2.z,p2.y);
				uvs.push(u,v2);

			}
		}










		var proj=mat4.perspective(45.,this.width/this.height,1.,100.);

		var matrix=mat4.identity();
		mat4.translate(matrix,[0,0,-5.]);
		mat4.rotate(matrix,angle,[0.0,1.0,0.0]);

		mat4.multiply(proj,matrix,matrix);

		var uniforms={
			matrix:matrix
		};


		this._.texture.use(0);
		this._.spareTexture.drawTo(function() {
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.superquadric.attributes({vertex:vertices,_texCoord:uvs},{vertex:3,_texCoord:2});
			gl.superquadric.uniforms(uniforms).drawTriangles();
			gl.disable(gl.DEPTH_TEST);
		},true);
		this._.spareTexture.swapWith(this._.texture);

		return this;
	}

// src/filters/video/displacement.js
	function displacement(strength) {
		gl.displacement = gl.displacement || new Shader(null, '\
        uniform sampler2D displacement_map;\
        uniform sampler2D texture;\
        uniform float strength;\
        varying vec2 texCoord;\
        void main() {\
            vec2 data = texture2D(displacement_map, texCoord).rg;\
            vec2 pos=texCoord + (data - vec2(0.5,0.5)) * strength; \
            gl_FragColor = texture2D(texture,pos);\
        }\
    ');

		var texture=this.stack_pop();
		texture.use(1);
		gl.displacement.textures({displacement_map: 0, texture: 1});
		simpleShader.call(this, gl.displacement, { strength: strength });
		texture.unuse(1);

		return this;
	}

// src/filters/video/preview.js
	function preview()
	{
		// Draw a downscaled copy of the current texture to the viewport

		/*
    var t=this._.texture;

    if(!this._.previewTexture)
      this._.previewTexture=new Texture(t.width/4,t.height/4,t.format,t.type);
    this._.previewTexture.ensureFormat(t.width/4,t.height/4,t.format,t.type );

    this._.texture.use();
    this._.previewTexture.drawTo(function() {
        Shader.getDefaultShader().drawRect();
    });
*/

		this.preview_width=320; this.preview_height=200;
		this._.texture.use();
		this._.flippedShader.drawRect(0,0,this.preview_width,this.preview_height);

		return this;
	}



// src/filters/video/smoothlife.js
	function smoothlife(birth_min,birth_max,death_min) {
		gl.smoothlife = gl.smoothlife || new Shader(null, '\
      uniform sampler2D texture;\
      uniform vec2 texSize;\
      varying vec2 texCoord;\
      uniform float birth_min;\
      uniform float birth_max;\
      uniform float death_min;\
      \
      vec3 cell(float x, float y){\
        return texture2D(texture,vec2(x,y)).rgb;\
      }\
      \
      void main(void){\
        float dx=1./texSize.x;\
        float dy=1./texSize.y;\
        float cx=texCoord.x;\
        float cy=texCoord.y;\
        vec3 value=cell(cx,cy);\
        vec3 inner=vec3(0.),outer=vec3(0.);\
        float outer_r=4.5;\
        float split_r=3.5;\
        for(int y=-5; y<=5; y++)\
          for(int x=-5; x<=5; x++)\
          {\
            float r=length(vec2(x,y));\
            float a=smoothstep(split_r-.5,split_r+0.5,r);\
            float b=1.-smoothstep(outer_r-.5,outer_r+.5,r);\
            vec3 c=cell(cx+float(x)*dx,cy+float(y)*dy);\
            inner+=c*(1.-a);\
            outer+=c*a*b;\
          }\
        outer/=(outer_r*outer_r-split_r*split_r)*3.14159;\
        inner/=split_r*split_r*3.14159;\
        vec3 birth=smoothstep(birth_min-.05,birth_min+.05,outer)*(vec3(1.)-smoothstep(birth_max-.05,birth_max+.05,outer));\
        vec3 death=smoothstep(death_min-.05,death_min+.05,outer);\
        value=mix(birth,vec3(1.)-death,smoothstep(.45,.55,inner));\
        value=clamp(value,0.0,1.0);\
        gl_FragColor = vec4(value, 1.);\
      }\
    ');

		simpleShader.call(this, gl.smoothlife, {
			birth_min:birth_min,
			birth_max:birth_max,
			death_min:death_min,
			texSize: [this.width, this.height]
		});

		return this;
	}


// src/filters/video/relief.js
	function relief(scale2,scale4) {
		gl.relief = gl.relief || new Shader(null,'\
      uniform sampler2D texture;\n\
      uniform sampler2D texture_blur2;\n\
      uniform sampler2D texture_blur4;\n\
      varying vec2 texCoord;\n\
      uniform vec2 texSize;\n\
         \n\
      void main(void) {\n\
        gl_FragColor = vec4(1.-abs(texture2D(texture, texCoord).y*2.-1.)); \n\
       \n\
        vec2 d = texSize*1.; \n\
        vec2 gy; // green texCoord gradient vector \n\
        gy.x = texture2D(texture, texCoord-vec2(1.,0.)*d).y - texture2D(texture, texCoord+vec2(1.,0.)*d).y; \n\
        gy.y = texture2D(texture, texCoord-vec2(0.,1.)*d).y - texture2D(texture, texCoord+vec2(0.,1.)*d).y; \n\
       \n\
        d = texSize*4.; \n\
       \n\
        vec2 gz; // blue blur2 gradient vector \n\
        gz.x += texture2D(texture_blur2, texCoord-vec2(1.,0.)*d).z - texture2D(texture_blur2, texCoord+vec2(1.,0.)*d).z; \n\
        gz.y += texture2D(texture_blur2, texCoord-vec2(0.,1.)*d).z - texture2D(texture_blur2, texCoord+vec2(0.,1.)*d).z; \n\
       \n\
        gl_FragColor = vec4(0.); \n\
       \n\
        gl_FragColor.y = texture2D(texture, texCoord + gz*texSize*64.).y*0.4 - (gz.x + gz.y)*0.4 + 0.4; // gradient enhancement and refraction \n\
        gl_FragColor.z = texture2D(texture_blur4, texCoord + 4.*gy - gz ).z*1.75 -0.0; // scatter/refract \n\
       \n\
        gl_FragColor.yz *= 1.- texture2D(texture_blur4, texCoord).x*2.5; // box shadow \n\
        gl_FragColor.x = texture2D(texture, texCoord).x*1.+0.25; // repaint over shadow \n\
         \n\
        gl_FragColor.y += gl_FragColor.x; // red -> yellow \n\
       \n\
        gl_FragColor.yz *= vec2(0.75,1.)- texture2D(texture_blur4, texCoord).z*1.5; // shadow \n\
        gl_FragColor.z += texture2D(texture, texCoord).z*1.5; // repaint over shadow \n\
        gl_FragColor.y += gl_FragColor.z*0.5 - 0.1; // blue -> cyan \n\
         \n\
         \n\
        //gl_FragColor = texture2D(texture, texCoord); // bypass \n\
         \n\
        gl_FragColor.a = 1.;\n\
      } \n\
    ');

		var texture=this.stack_push();
		this.fastBlur(scale2);
		var blur2=this.stack_push();
		this.fastBlur(scale4);
		var blur4=this.stack_push();

		this.stack_pop();
		this.stack_pop();
		this.stack_pop();

		texture.use(0);
		blur2.use(1);
		blur4.use(2);
		gl.relief.textures({
			texture: 0,
			texture_blur2: 1,
			texture_blur4: 2
		});

		simpleShader.call(this, gl.relief, {
			texSize: [1./this.width,1./this.height],
		},texture);

		blur2.unuse(2);
		blur4.unuse(4);

		return this;
	}


// src/filters/video/life.js
	function life() {
		gl.life = gl.life || new Shader(null, '\
      uniform sampler2D texture;\
      uniform vec2 texSize;\
      varying vec2 texCoord;\
\
      float cell(float x, float y){\
	      float f=dot(texture2D(texture,vec2(x,y)),vec4(.33,.33,.33,0.));\
	      return floor(f+0.5);\
      }\
\
      void main(void){\
        float dx=1./texSize.x;\
        float dy=1./texSize.y;\
	      float x=texCoord.x;\
	      float y=texCoord.y;\
         float m=cell(x,y);\
         float l=cell(x-dx,y);\
         float r=cell(x+dx,y);\
         float u=cell(x,y-dy);\
         float d=cell(x,y+dy);\
         float ld=cell(x-dx,y+dy);\
         float ru=cell(x+dx,y-dy);\
         float lu=cell(x-dx,y-dy);\
         float rd=cell(x+dx,y+dy);\
	\
	      float num;\
	      num=l+r+u+d+ld+ru+lu+rd;\
	      float outp=m;\
	      if (m>0.){                \
		      if(num<2.) outp=0.;\
		      if(num>3.) outp=0.;\
	      } else if (num>2. && num<4.) outp=1.;\
         gl_FragColor = vec4(outp, outp, outp, 1.);\
      }\
    ');

		simpleShader.call(this, gl.life, {texSize: [this.width, this.height]});

		return this;
	}


// src/filters/video/video.js
	function video()
	{

		var v=this._.videoFilterElement;
		if(!v)
		{
			var v = document.createElement('video');
			v.autoplay = true;
			v.muted=true;
			v.loop=true;
			v.src="test.mp4";
			this._.videoFilterElement=v;
		}

		// make sure the video has adapted to the video source
		if(v.currentTime==0 || !v.videoWidth) return this;

		if(!this._.videoTexture) this._.videoTexture=this.texture(v);
		this._.videoTexture.loadContentsOf(v);
		this.draw(this._.videoTexture);

		return this;
	}

// src/filters/video/colorkey.js
	function colorkey(r,g,b,threshold,feather) {
		gl.colorkey = gl.colorkey || new Shader(null, '\
      uniform sampler2D texture;\
      uniform sampler2D texture1;\
      uniform vec3 key_color;\
      uniform float threshold;\
      uniform float feather;\
      varying vec2 texCoord;\
      vec3 coeffY=vec3(0.2989,0.5866,0.1145);\
      vec2 coeff =vec2(0.7132,0.5647); \
      void main() {\
        vec4 color  = texture2D(texture , texCoord);\
        vec4 color1 = texture2D(texture1, texCoord);\
        float kY=dot(key_color,coeffY);\
        float Y =dot(color.rgb,coeffY);\
        vec2  k=coeff * (key_color.rb-vec2(kY,kY)); \
        vec2  c=coeff * (color.rb-vec2(Y,Y)); \
        float d=distance(c,k); \
        float alpha=clamp((d - threshold) / feather, 0.0, 1.0); \
        gl_FragColor = mix(color1, color, alpha);\
      }\
    ');

		var texture1=this.stack_pop();
		texture1.use(1);
		gl.colorkey.textures({texture: 0, texture1: 1});
		simpleShader.call(this, gl.colorkey, { key_color:[r,g,b], threshold: threshold, feather: feather });
		texture1.unuse(1);

		return this;
	}

// Not in original glfx source code
	function colorkeyv2(r,g,b) {
		gl.colorkeyv2 = gl.colorkeyv2 || new Shader(null, `
	uniform sampler2D texture; // Image with green screen
	uniform sampler2D texture1; // Image behind
	
	uniform vec3 key_color;
	
	varying vec2 texCoord;
	
	vec3 rgb2hsv(vec3 rgb)
	{
		float Cmax = max(rgb.r, max(rgb.g, rgb.b));
		float Cmin = min(rgb.r, min(rgb.g, rgb.b));
		float delta = Cmax - Cmin;
	
		vec3 hsv = vec3(0., 0., Cmax);
		
		if (Cmax > Cmin)
		{
			hsv.y = delta / Cmax;
	
			if (rgb.r == Cmax)
				hsv.x = (rgb.g - rgb.b) / delta;
			else
			{
				if (rgb.g == Cmax)
					hsv.x = 2. + (rgb.b - rgb.r) / delta;
				else
					hsv.x = 4. + (rgb.r - rgb.g) / delta;
			}
			hsv.x = fract(hsv.x / 6.);
		}
		return hsv;
	}
	
	float chromaKey(vec3 color)
	{
		vec3 weights = vec3(4., 1., 2.);
	
		vec3 hsv = rgb2hsv(color);
		vec3 target = rgb2hsv(key_color);
		float dist = length(weights * (target - hsv));
		return 1. - clamp(3. * dist - 1.5, 0., 1.);
	}
	
	void main()
	{
		vec3 color = texture2D(texture, texCoord).rgb;
		vec3 bg = texture2D(texture1, texCoord).rgb;
		
		float incrustation = chromaKey(color);
		
		color = mix(color, bg, incrustation);
		gl_FragColor = vec4(color, 1.);
	}
	`);

		var texture1=this.stack_pop();
		texture1.use(1);
		gl.colorkeyv2.textures({texture: 0, texture1: 1});
		simpleShader.call(this, gl.colorkeyv2, { key_color:[r,g,b] });
		texture1.unuse(1);

		return this;
	}

// src/filters/video/denoisefast.js
	/**
	 * @filter         Denoise Fast
	 * @description    Smooths over grainy noise in dark images using an 9x9 box filter
	 *                 weighted by color intensity, similar to a bilateral filter.
	 * @param exponent The exponent of the color intensity difference, should be greater
	 *                 than zero. A value of zero just gives an 9x9 box blur and high values
	 *                 give the original image, but ideal values are usually around 10-100.
	 */
	function denoisefast(exponent) {
		// Do a 3x3 bilateral box filter
		gl.denoisefast = gl.denoisefast || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float exponent;\
        uniform float strength;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec4 center = texture2D(texture, texCoord);\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            for (float x = -1.0; x <= 1.0; x += 1.0) {\
                for (float y = -1.0; y <= 1.0; y += 1.0) {\
                    vec4 sample = texture2D(texture, texCoord + vec2(x, y) / texSize);\
                    float weight = 1.0 - abs(dot(sample.rgb - center.rgb, vec3(0.25)));\
                    weight = pow(weight, exponent);\
                    color += sample * weight;\
                    total += weight;\
                }\
            }\
            gl_FragColor = color / total;\
        }\
    ');

		// Perform five iterations for stronger results
		for (var i = 0; i < 5; i++) {
			simpleShader.call(this, gl.denoisefast, {
				exponent: Math.max(0, exponent),
				texSize: [this.width, this.height]
			});
		}

		return this;
	}

// src/filters/video/polygon.js
	function polygon(sides,x,y,size,angle) {

		gl.polygon = gl.polygon || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 size;\
        uniform float sides;\
        uniform float angle;\
        uniform vec2 center;\
        uniform vec2 aspect;\
        varying vec2 texCoord;\
        float PI=3.14159; \
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            vec2 uv=texCoord-vec2(0.5,0.5)-center;\
            uv/=size;\
            \
            float a=atan(uv.x,uv.y)-angle; \
            float r=length(uv); \
            \
            float d = r / (cos(PI/sides)/cos(mod(a,(2.*PI/sides))-(PI/sides))); \
            \
            if(d<1.) \
              gl_FragColor=color; \
            else \
              gl_FragColor=vec4(0.); \
        }\
    ');

		simpleShader.call(this, gl.polygon, {
			size:[size*this.height/this.width,size],
			sides:Math.floor(sides),
			angle:angle,
			center: [x,y]
		});

		return this;
	}


// src/filters/video/rainbow.js
	function rainbow(size, angle) {
		gl.rainbow = gl.rainbow || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
          vec4 rgba = texture2D(texture, texCoord);\
          float l=dot(rgba,vec4(1.,1.,1.,0.)/3.0); \
          vec3 hsv=vec3(l,1.,1.); \
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0); \
          vec3 p = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www); \
          vec3 rgb=hsv.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), hsv.y); \
          \
          gl_FragColor = vec4(rgb,rgba.a);\
        }\
    ');

		simpleShader.call(this, gl.rainbow, {});

		return this;
	}

// src/filters/video/mesh_displacement.js
	function mesh_displacement(sx,sy,sz,anglex,angley,anglez) {
		gl.mesh_displacement = gl.mesh_displacement || new Shader('\
    attribute vec2 _texCoord;\
    varying vec2 texCoord;\
    uniform mat4 matrix;\
    uniform sampler2D displacement_map;\
    uniform vec3 strength;\
    void main() {\
        texCoord = _texCoord;\
        vec3 dis = texture2D(displacement_map, _texCoord).xyz-0.5;\
        vec4 pos=matrix * (vec4(vec3(_texCoord,0.0)+dis*strength,1.0));\
        gl_Position = pos/pos.w;\
    }');

		// generate grid mesh
		if(!this._.gridMeshUvs)
		{
			this._.gridMeshUvs=[];
			var dx=1./640.;
			var dy=1./480.;
			for (var y=0;y<=1.0;y+=dy) {
				for (var x=0;x<=1.0;x+=dx) {
					this._.gridMeshUvs.push(x,y);
					this._.gridMeshUvs.push(x,y-dy);
				}
			}
			gl.mesh_displacement.attributes({_texCoord:this._.gridMeshUvs},{_texCoord:2});
		}

		// perspective projection matrix
		var proj=mat4.perspective(45.,this.width/this.height,1.,100.);
		// camera placement transformation matrix
		var matrix=mat4.identity();
		mat4.translate(matrix,[0,0,-2.]);
		mat4.rotate(matrix,anglex,[1.0,0.0,0.0]);
		mat4.rotate(matrix,angley,[0.0,1.0,0.0]);
		mat4.rotate(matrix,anglez,[0.0,0.0,1.0]);
		mat4.translate(matrix,[-1.,-1.,0]);
		mat4.scale(matrix,[2.0,2.0,2.0]);
		mat4.multiply(proj,matrix,matrix);

		// set shader parameters
		gl.mesh_displacement.uniforms({
			matrix:matrix,
			strength: [sx,sy,sz]
		});

		// set shader textures
		this._.texture.use(0);
		var texture=this.stack_pop();
		texture.use(1);
		gl.mesh_displacement.textures({displacement_map: 0, texture: 1});


		// render 3d mesh stored in vertices,uvs to spare texture
		this._.spareTexture.drawTo(function() {
			gl.enable(gl.DEPTH_TEST);
			gl.enable(gl.CULL_FACE);
			gl.frontFace(gl.CCW);
			gl.depthFunc(gl.LEQUAL);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.mesh_displacement.drawTriangles();
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.CULL_FACE);
		},true);
		// replace current texture by spare texture
		this._.spareTexture.swapWith(this._.texture);

		texture.unuse(1);

		return this;
	}

// src/filters/video/analogize.js
	function analogize(exposure,gamma,glow,radius) {
		gl.analogize = gl.analogize || new Shader(null,'\
    \
      uniform sampler2D texture;\
      uniform sampler2D glow_texture;\
      varying vec2 texCoord;\
		  uniform float Glow; \
		  uniform float Exposure;\
		  uniform float Gamma;\
		  void main(void){\
		     vec3 color  = texture2D(glow_texture,vec2(texCoord)).rgb*Glow;\
		     color  += 	texture2D(texture,texCoord).rgb;\
		     color=1.0-exp(-Exposure*color);\
		     color=pow(color, vec3(Gamma,Gamma,Gamma));\
		     gl_FragColor.rgb = color;\
		     gl_FragColor.a = 1.0;\
		  } \
    ');

		// Store a copy of the current texture in the second texture unit
		this._.extraTexture.ensureFormat(this._.texture);
		this._.texture.use();
		this._.extraTexture.drawTo(function() {
			Shader.getDefaultShader().drawRect();
		});

		// Blur the current texture, then use the stored texture to detect edges
		this._.extraTexture.use(1);
		this.fastBlur(radius);
		gl.analogize.textures({
			glow_texture: 0,
			texture: 1
		});
		simpleShader.call(this, gl.analogize, {
			Glow: glow,
			Exposure: exposure,
			Gamma: gamma
		});
		this._.extraTexture.unuse(1);

		return this;
	}


// src/filters/video/feedbackIn.js
	function feedbackIn()
	{
		// Store a copy of the current texture in the feedback texture unit

		var t=this._.texture;
		if(!this._.feedbackTexture)
			this._.feedbackTexture=new Texture(t.width,t.height,t.format,t.type);

		this._.feedbackTexture.ensureFormat(this._.texture);
		this._.texture.use();
		this._.feedbackTexture.drawTo(function() {
			Shader.getDefaultShader().drawRect();
		});

		return this;
	}

// src/filters/video/capture.js
	function capture(source_index)
	{
		source_index=Math.floor(source_index);
		var v=this.video_source(source_index);

		// make sure the video has adapted to the capture source
		if(!v || v.currentTime==0 || !v.videoWidth) return this;

		if(!this._.videoTexture) this._.videoTexture=this.texture(v);
		this._.videoTexture.loadContentsOf(v);
		this.draw(this._.videoTexture);

		return this;
	}

// src/filters/video/mandelbrot.js
	function mandelbrot(x,y,scale,angle,iterations) {

		iterations=Math.min(15,Math.abs(iterations));

		// use a single shader.
		// another implementation used one shaderi source per int(iterations), but Odroid XU4 crashed on that. On U3, it was fine.
		gl.mandelbrot = gl.mandelbrot || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec4 xform;\
        uniform vec2 center;\
        uniform float iterations; \
        varying vec2 texCoord;\
        mat2 mat=mat2(xform.xy,xform.zw);\
        void main() {\
            vec2 c=mat*(texCoord-center);\
            vec2 z; \
            vec2 nz=c; \
            for (int iter = 0;iter <= 15; iter++){ \
              if(iter>=int(iterations)) break;  \
              z = nz; \
              nz = vec2(z.x*z.x-z.y*z.y, 2.0*z.x*z.y) + c ; \
            } \
            vec2 pos=mix(z,nz,fract(iterations));\
            gl_FragColor = texture2D(texture, pos/8.0+vec2(0.5,0.5));\
        }\
    ');

		simpleShader.call(this, gl.mandelbrot, {
			xform: [
				Math.cos(angle)*scale, Math.sin(angle)*scale,
				-Math.sin(angle)*scale, Math.cos(angle)*scale
			],
			iterations  : iterations,
			center: [x-this.width/2,y-this.height/2], // TODO remove this fix to cope with UI values top-left origin
			texSize: [this.width, this.height]
		});

		return this;
	}


// src/filters/video/supershape.js
	function supershape(angleX,angleY,a1,b1,m1,n11,n21,n31,a2,b2,m2,n12,n22,n32) {

		if(!gl.supershape)
		{
			gl.supershape = new Shader('\
      float superFormula(in float a, in float b, in float m, in float n1, in float n2, in float n3, in float phi)\
      {\
          vec2 ret;\
          float Out;\
          float t1 = cos(m * phi / 4.0);\
          t1 = t1 / a;\
          t1 = abs(t1);\
          t1 = pow(t1, n2);\
          float t2 = sin(m * phi / 4.0);\
          t2 = t2 / b;\
          t2 = abs(t2);\
          t2 = pow(t2, n3);\
          float T = t1 + t2;\
          Out = pow(T, 1.0 / n1);\
          if (abs(Out) == 0.0) {\
              Out = 0.0;\
          } else {\
              Out = 1.0 / Out;\
          }\
       \
          return Out;\
      }\
      \
      uniform float a;\
      uniform float b;\
      uniform float m;\
      uniform float n1;\
      uniform float n2;\
      uniform float n3;\
      uniform float ab;\
      uniform float bb;\
      uniform float mb;\
      uniform float n1b;\
      uniform float n2b;\
      uniform float n3b;\
      \
      attribute vec2 _texCoord;\
      varying vec2 texCoord;\
      uniform mat4 matrix;\
      \
      float PI=3.14159;\
      \
      void main()\
      {\
          vec2 uv = (_texCoord-vec2(0.5)) * vec2(2.*PI,PI);\
           \
          float rt = superFormula(a,b,m, n1, n2, n3, uv.x);\
          float rp = superFormula(ab,bb,mb, n1b, n2b, n3b, uv.y);\
          float st = sin(uv.x);\
          float ct = cos(uv.x);\
          float sp = sin(uv.y);\
          float cp = cos(uv.y);\
           \
          vec4 pos;\
          pos.x = rt * ct * rp * cp;\
          pos.z = rt * st * rp * cp;\
          pos.y = rp * sp;\
          pos.w=1.;\
                \
          texCoord = _texCoord;\
          pos=matrix*pos;\
          gl_Position = pos/pos.w;\
      }','\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
          vec4 rgba = texture2D(texture, texCoord);\
          gl_FragColor = rgba;\
        }\
      ');
			var uvs=[];
			for (sv=-Math.PI/2,i=0;sv<=Math.PI/2;sv+=Math.PI/50,i++) {
				for (su=-Math.PI,j=0;su<=Math.PI;su+=Math.PI/100,j++) {

					var u=su/Math.PI/2+0.5;
					var v=sv/Math.PI+0.5;

					var sv2=sv-Math.PI/25;
					var v2=sv2/Math.PI+0.5;

					uvs.push(u,v);
					uvs.push(u,v2);
				}
			}
			gl.supershape.attributes({_texCoord:uvs},{_texCoord:2});
		}

		var proj=mat4.perspective(45.,this.width/this.height,1.,100.);
		var matrix=mat4.identity();
		mat4.translate(matrix,[0,0,-5.]);
		mat4.rotate(matrix,angleX,[1.0,0.0,0.0]);
		mat4.rotate(matrix,angleY,[0.0,1.0,0.0]);
		mat4.multiply(proj,matrix,matrix);

		var uniforms={
			a: a1, b: b1, m:m1, n1:n11, n2:n21, n3:n31,
			ab: a2, bb: b2, mb:m2, n1b:n12, n2b:n22, n3b:n32,
			matrix:matrix
		};

		var supershapeMeshUVs=this._.supershapeMeshUVs;
		this._.texture.use(0);
		this._.spareTexture.drawTo(function() {
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.supershape.uniforms(uniforms).drawTriangles();
			gl.disable(gl.DEPTH_TEST);
		},true);
		this._.spareTexture.swapWith(this._.texture);

		return this;
	}

// src/filters/video/stack.js
	function stack_push(from_texture)
	{
		// push given or current image onto stack
		if(!from_texture) from_texture=this._.texture;


		// add another texture to empty stack pool if needed
		var t=this._.texture;
		if(!this._.stackUnused.length)
			this._.stackUnused.push(new Texture(t.width,t.height,t.format,t.type));

		// check for stack overflow
		if(this._.stack.length>10)
		{
			console.log('glfx.js video stack overflow!');
			return this;
		}

		// copy current frame on top of the stack
		from_texture.use();
		var nt=this._.stackUnused.pop();
		nt.drawTo(function() { Shader.getDefaultShader().drawRect(); });
		this._.stack.push(nt);

		return nt;
	}

	function stack_pop(to_texture)
	{
		var texture=this._.stack.pop();
		if(!texture)
		{
			console.log('glfx.js video stack underflow!');
			return this._.texture;
		}
		this._.stackUnused.push(texture);

		if(to_texture)
		{
			texture.swapWith(to_texture);
			return null;
		}

		return texture;
	}

	function stack_swap()
	{
		// exchange topmost stack element with current texture
		if(this._.stack.length<1) return;
		this._.texture.swapWith(this._.stack[this._.stack.length-1]);
	}

	function stack_prepare()
	{
		// check stack

		// make sure the stack is there
		if(!this._.stack) this._.stack=[];
		if(!this._.stackUnused) this._.stackUnused=[];

		// report if stack is still full
		if(this._.stack.length)
			console.log("glfx.js video stack leaks "+this._.stack.length+" elements.");

		// pop any remaining elements
		while(this._.stack.length)
			this._.stackUnused.push(this._.stack.pop());
	}



// src/filters/video/timeshift.js
	function timeshift(time)
	{
		// Store a stream of the last second in a ring buffer

		var max_frames=25;

		if(!this._.pastTextures) this._.pastTextures=[];

		var t=this._.texture;
		if(this._.pastTextures.length<max_frames)
			this._.pastTextures.push(new Texture(t.width,t.height,t.format,t.type));

		// copy current frame to the start of the queue, pushing all frames back
		var nt=this._.pastTextures.pop();
		this._.texture.use();
		nt.drawTo(function() { Shader.getDefaultShader().drawRect(); });
		this._.pastTextures.unshift(nt);

		// copy past frame from the queue to the current texture, if available
		var j=Math.abs(Math.floor(time) % max_frames);
		if(this._.pastTextures[j])
		{
			this._.pastTextures[j].use();
			this._.texture.drawTo(function() { Shader.getDefaultShader().drawRect(); });
		}

		return this;
	}

// src/filters/video/reaction.js
	function reaction(noise_factor,zoom_speed,scale1,scale2,scale3,scale4) {
		gl.reaction = gl.reaction || new Shader(null,'\
      uniform sampler2D texture;\n\
      uniform sampler2D texture_blur;\n\
      uniform sampler2D texture_blur2;\n\
      uniform sampler2D texture_blur3;\n\
      uniform sampler2D texture_blur4;\n\
      uniform float noise_factor;\n\
      uniform float zoom_speed;\n\
      varying vec2 texCoord;\n\
      uniform vec2 texSize;\n\
      uniform vec4 rnd;\n\
      \
      \n\
      bool is_onscreen(vec2 uv){\n\
	      return (uv.x < 1.) && (uv.x > 0.) && (uv.y < 1.) && (uv.y > 0.);\n\
      }\n\
      \n\
      vec3 mod289(vec3 x) {\n\
        return x - floor(x * (1.0 / 289.0)) * 289.0;\n\
      }\n\
      \n\
      vec2 mod289(vec2 x) {\n\
        return x - floor(x * (1.0 / 289.0)) * 289.0;\n\
      }\n\
      \n\
      vec3 permute(vec3 x) {\n\
        return mod289(((x*34.0)+1.0)*x);\n\
      }\n\
      \n\
      float snoise(vec2 v)\n\
        {\n\
        const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0\n\
                            0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)\n\
                           -0.577350269189626,  // -1.0 + 2.0 * C.x\n\
                            0.024390243902439); // 1.0 / 41.0\n\
      // First corner\n\
        vec2 i  = floor(v + dot(v, C.yy) );\n\
        vec2 x0 = v -   i + dot(i, C.xx);\n\
      \n\
      // Other corners\n\
        vec2 i1;\n\
        //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0\n\
        //i1.y = 1.0 - i1.x;\n\
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n\
        // x0 = x0 - 0.0 + 0.0 * C.xx ;\n\
        // x1 = x0 - i1 + 1.0 * C.xx ;\n\
        // x2 = x0 - 1.0 + 2.0 * C.xx ;\n\
        vec4 x12 = x0.xyxy + C.xxzz;\n\
        x12.xy -= i1;\n\
      \n\
      // Permutations\n\
        i = mod289(i); // Avoid truncation effects in permutation\n\
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))\n\
		      + i.x + vec3(0.0, i1.x, 1.0 ));\n\
      \n\
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);\n\
        m = m*m ;\n\
        m = m*m ;\n\
      \n\
      // Gradients: 41 points uniformly over a line, mapped onto a diamond.\n\
      // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)\n\
      \n\
        vec3 x = 2.0 * fract(p * C.www) - 1.0;\n\
        vec3 h = abs(x) - 0.5;\n\
        vec3 ox = floor(x + 0.5);\n\
        vec3 a0 = x - ox;\n\
      \n\
      // Normalise gradients implicitly by scaling m\n\
      // Approximation of: m *= inversesqrt( a0*a0 + h*h );\n\
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );\n\
      \n\
      // Compute final noise value at P\n\
        vec3 g;\n\
        g.x  = a0.x  * x0.x  + h.x  * x0.y;\n\
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n\
        return 130.0 * dot(m, g);\n\
      }\n\
      \n\
      void main(void) {\n\
        \n\
        vec4 noise=vec4(snoise((texCoord + rnd.xy)*10.)); \n\
        noise-=vec4(0.5);\
        noise*=noise_factor; \
       \n\
        // overall plane deformation vector (zoom-in on the mouse position)\n\
        \n\
        vec2 c = vec2(0.5)+(rnd.zw-0.5)*texSize*16.0; // adding random to avoid artifacts\n\
        vec2 uv = c+(texCoord-c)*(1.0-zoom_speed); // 0.7% zoom in per frame\n\
       \n\
        // green: very soft reaction-diffusion (skin dot synthesis simulation)\n\
       \n\
        gl_FragColor.y = texture2D(texture, uv).y + noise.y*0.0066; // a dash of error diffusion;\n\
        gl_FragColor.y += (texture2D(texture, uv).y-texture2D(texture_blur4, uv).y)*0.0166; // sort of a Laplacian\n\
        \n\
        // ^^ yes, that is all the magic for green.\n\
        \n\
        // blue: just another reaction-diffusion with green as inhibitor, also different color gradients are used as plane deformation vector\n\
        \n\
        vec2 d = texSize*8.;\n\
        vec2 gy; // gradient in green\n\
        gy.x = texture2D(texture_blur2, texCoord-vec2(1.,0.)*d).y - texture2D(texture_blur2, texCoord+vec2(1.,0.)*d).y;\n\
        gy.y = texture2D(texture_blur2, texCoord-vec2(0.,1.)*d).y - texture2D(texture_blur2, texCoord+vec2(0.,1.)*d).y;\n\
      \n\
        d = texSize*4.;\n\
        vec2 gz; // gradient in blue\n\
        gz.x = texture2D(texture_blur, texCoord-vec2(1.,0.)*d).z - texture2D(texture_blur, texCoord+vec2(1.,0.)*d).z;\n\
        gz.y = texture2D(texture_blur, texCoord-vec2(0.,1.)*d).z - texture2D(texture_blur, texCoord+vec2(0.,1.)*d).z;\n\
      \n\
        uv += gy.yx*vec2(1.,-1.)*texSize*4. //gradient in green rotated by 90 degree\n\
          - gy*texSize*16. // gradient in green\n\
          - gz*texSize*0.25 // gradient of blue - makes the "traveling wave fronts" usually\n\
          + gz.yx*vec2(-1.,1.)*texSize*4.; // rotated gradient of blue - makes the painterly effect here\n\
        gl_FragColor.z = texture2D(texture, uv).z + noise.z*0.12; // error diffusion\n\
        gl_FragColor.z += (texture2D(texture, uv).z-texture2D(texture_blur3, uv).z)*0.11; // teh magic :P\n\
      \n\
        gl_FragColor.z +=  - (gl_FragColor.y-0.02)*.025;\n\
      \n\
        // that\'s all for blue ^^\n\
        // since this became such a beauty, the code for red is mostly a copy, but the inhibitor is inverted to the absence of green\n\
      \n\
        vec2 gx; // gradient in blue\n\
        gx.x = texture2D(texture_blur, texCoord-vec2(1.,0.)*d).x - texture2D(texture_blur, texCoord+vec2(1.,0.)*d).x;\n\
        gx.y = texture2D(texture_blur, texCoord-vec2(0.,1.)*d).x - texture2D(texture_blur, texCoord+vec2(0.,1.)*d).x;\n\
      \n\
        uv += - gy.yx*vec2(1.,-1.)*texSize*8. //gradient in green rotated by 90 degree\n\
          + gy*texSize*32. // gradient in green\n\
          - gx*texSize*0.25 // gradient of red - makes the "traveling wave fronts" usually\n\
          - gx.yx*vec2(-1.,1.)*texSize*4.; // rotated gradient of red - makes the painterly effect here\n\
        gl_FragColor.x = texture2D(texture, uv).x + noise.x*0.12; // error diffusion\n\
        gl_FragColor.x += (texture2D(texture, uv).x-texture2D(texture_blur3, uv).x)*0.11; // reaction diffusion\n\
      \n\
        gl_FragColor.x +=  - ((1.-gl_FragColor.y)-0.02)*.025;\n\
      \n\
        gl_FragColor.a = 1.;\n\
      }\n\
    ');

		var texture=this.stack_push();
		this.fastBlur(scale1);
		var blur=this.stack_push();
		this.fastBlur(scale2);
		var blur2=this.stack_push();
		this.fastBlur(scale3);
		var blur3=this.stack_push();
		this.fastBlur(scale4);
		var blur4=this.stack_push();

		this.stack_pop();
		this.stack_pop();
		this.stack_pop();
		this.stack_pop();
		this.stack_pop();

		texture.use(0);
		blur.use(1);
		blur2.use(2);
		blur3.use(3);
		blur4.use(4);
		gl.reaction.textures({
			texture: 0,
			texture_blur: 1,
			texture_blur2: 2,
			texture_blur3: 3,
			texture_blur4: 4
		});

		simpleShader.call(this, gl.reaction, {
			texSize: [1./this.width,1./this.height],
			rnd: [Math.random(),Math.random(),Math.random(),Math.random()],
			noise_factor: noise_factor,
			zoom_speed: zoom_speed
		},texture);

		blur.unuse(1);
		blur2.unuse(2);
		blur3.unuse(3);
		blur4.unuse(4);



		return this;
	}


// src/filters/video/tile.js
	function tile(size,centerx,centery) {
		gl.tile = gl.tile || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
      	uniform float size;\
        varying vec2 texCoord;\
        void main() {\
          vec4 color = texture2D(texture, fract((texCoord-center)*size));\
          gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.tile, {size:size,center: [centerx,centery]});

		return this;
	}


// src/filters/video/ripple.js
	function ripple(fx,fy,angle,amplitude) {
		gl.ripple = gl.ripple || warpShader('\
        uniform vec4 xform;\
        uniform float amplitude;\
        uniform vec2 center;\
        mat2 mat=mat2(xform.xy,xform.zw);\
    ', '\
        coord -= center;\
        coord += amplitude*sin(mat*coord);\
        coord += center;\
    ');

		simpleShader.call(this, gl.ripple, {
			xform: [
				Math.cos(angle)*fx, Math.sin(angle)*fy,
				-Math.sin(angle)*fx, Math.cos(angle)*fy
			],
			amplitude: amplitude,
			center: [this.width/2, this.height/2],
			texSize: [this.width, this.height]
		});

		return this;
	}


// src/filters/video/patch_displacement.js
	function patch_displacement(sx,sy,sz,anglex,angley,anglez,scale,pixelate) {
		gl.patch_displacement = gl.patch_displacement || new Shader('\
    attribute vec3 vertex;\
    attribute vec2 _texCoord;\
    varying vec2 texCoord;\
    uniform mat4 matrix;\
    uniform sampler2D displacement_map;\
    uniform vec3 strength;\
    uniform float scale;\
    uniform float pixelate;\
    void main() {\
        texCoord = mix(vertex.xy,_texCoord,pixelate)*scale;\
        vec3 dis = texture2D(displacement_map, _texCoord).xyz-0.5;\
        vec4 pos=matrix * (vec4((vertex+dis*strength)*scale,1.0));\
        gl_Position = pos/pos.w;\
    }');

		// generate grid mesh
		if(!this._.gridPatchesVertices)
		{
			this._.gridPatchesVertices=[];
			this._.gridPatchesUvs=[];
			var dx=1./160.;
			var dy=1./100.;
			for (var y=0;y<=1.0;y+=dy) {
				for (var x=0;x<=1.0;x+=dx) {
					this._.gridPatchesVertices.push(x,y,0);
					this._.gridPatchesUvs.push(x+dx/2,y+dy/2);
					this._.gridPatchesVertices.push(x,y+dy,0);
					this._.gridPatchesUvs.push(x+dx/2,y+dy/2);
					this._.gridPatchesVertices.push(x+dx,y+dy,0);
					this._.gridPatchesUvs.push(x+dx/2,y+dy/2);

					this._.gridPatchesVertices.push(x,y,0);
					this._.gridPatchesUvs.push(x+dx/2,y+dy/2);
					this._.gridPatchesVertices.push(x+dx,y+dy,0);
					this._.gridPatchesUvs.push(x+dx/2,y+dy/2);
					this._.gridPatchesVertices.push(x+dx,y,0);
					this._.gridPatchesUvs.push(x+dx/2,y+dy/2);
				}
			}
			gl.patch_displacement.attributes({vertex: this._.gridPatchesVertices,_texCoord:this._.gridPatchesUvs},{vertex: 3, _texCoord:2});
		}

		// perspective projection matrix
		var proj=mat4.perspective(45.,this.width/this.height,1.,100.);
		// camera placement transformation matrix
		var matrix=mat4.identity();
		mat4.translate(matrix,[0,0,-2.]);
		mat4.rotate(matrix,anglex,[1.0,0.0,0.0]);
		mat4.rotate(matrix,angley,[0.0,1.0,0.0]);
		mat4.rotate(matrix,anglez,[0.0,0.0,1.0]);
		mat4.translate(matrix,[-1.,-1.,0]);
		mat4.scale(matrix,[2.0,2.0,2.0]);
		mat4.multiply(proj,matrix,matrix);

		// set shader parameters
		gl.patch_displacement.uniforms({
			matrix:matrix,
			strength: [sx,sy,sz],
			scale: scale,
			pixelate:pixelate
		});

		// set shader textures
		this._.texture.use(0);
		var texture=this.stack_pop();
		texture.use(1);
		gl.patch_displacement.textures({displacement_map: 0, texture: 1});

		// render 3d mesh stored in vertices,uvs to spare texture
		this._.spareTexture.drawTo(function() {
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.patch_displacement.drawTriangles(gl.TRIANGLES);
			gl.disable(gl.DEPTH_TEST);
		},true);
		// replace current texture by spare texture
		this._.spareTexture.swapWith(this._.texture);

		texture.unuse(1);

		return this;
	}

// src/filters/video/waveform.js
	function waveform()
	{
		var values=audio_engine.waveform;
		if(!values) return;

		if(!this._.waveformTexture)
			this._.waveformTexture=new Texture(values.length,1,gl.LUMINANCE,gl.UNSIGNED_BYTE);

		this._.waveformTexture.load(values);

		this._.waveformTexture.use();
		this._.texture.drawTo(function() {
			Shader.getDefaultShader().drawRect();
		});

		return this;
	}

// src/filters/video/absolute.js
	function absolute(size, angle) {
		gl.absolute = gl.absolute || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
          vec4 rgba = texture2D(texture, texCoord);\
          vec3 abs_rgb  = abs(rgba.rgb-vec3(0.5))*2.0; \
          gl_FragColor = vec4(abs_rgb,rgba.a);\
        }\
    ');

		simpleShader.call(this, gl.absolute, {});

		return this;
	}

// src/filters/video/matte.js
	function matte(r,g,b) {
		gl.matte = gl.matte || new Shader(null, '\
        uniform vec3 color;\
        void main() {\
            gl_FragColor = vec4(color,1.);\
        }\
    ');
		simpleShader.call(this, gl.matte, {color:[r,g,b]});
		return this;
	}

// src/filters/video/feedbackOut.js
	function feedbackOut(blend) {
		gl.feedbackOut = gl.feedbackOut || new Shader(null, '\
        uniform sampler2D texture;\
        uniform sampler2D feedbackTexture;\
        uniform float blend;\
        varying vec2 texCoord;\
        void main() {\
            vec4 original = texture2D(texture, texCoord);\
            vec4 feedback = texture2D(feedbackTexture, texCoord);\
            gl_FragColor = mix(original, feedback, blend);\
        }\
    ');

		var t=this._.texture;
		if(!this._.feedbackTexture)
			this._.feedbackTexture=new Texture(t.width,t.height,t.format,t.type);

		this._.feedbackTexture.ensureFormat(this._.texture);
		this._.feedbackTexture.use(1);
		gl.feedbackOut.textures({
			texture: 0,
			feedbackTexture: 1
		});
		simpleShader.call(this, gl.feedbackOut, {
			blend: blend
		});
		this._.feedbackTexture.unuse(1);

		return this;
	}

// src/filters/video/particle_displacement.js
	function particles(anglex,angley,anglez,size,strength,homing,noise,displacement) {
		gl.particles = gl.particles || new Shader('\
    attribute vec2 _texCoord;\
    uniform sampler2D texture;\
    uniform mat4 matrix;\
    uniform sampler2D particles;\
    uniform float strength;\
    uniform float size;\
    varying vec4 rgba;\
    void main() {\
        vec3 loc = texture2D(particles, _texCoord).xyz-0.5;\
        loc=mix(vec3(_texCoord,0.0),loc,strength);\
        vec4 pos=matrix * vec4(loc,1.0);\
        gl_Position = pos/pos.w;\
        gl_PointSize=size/pos.w;\
        rgba = texture2D(texture, _texCoord);\
    }','\
    varying vec4 rgba;\
    void main() {\
      vec2 uv=gl_PointCoord;\
      float d=2.*max(0.,0.5-length(uv-vec2(0.5)));\
      gl_FragColor = rgba*2.*d;\
      if(rgba.a*d<.1) discard; \
    }\
    ');

		gl.particle_update = gl.particle_update || new Shader(null,'\
        uniform sampler2D texture;\
        uniform sampler2D displacement_texture;\
        uniform float homing; \
        uniform float noise; \
        uniform float displacement; \
        varying vec2 texCoord;\
        vec3 noise3(vec3 t){\
          vec3 dots=vec3(\
            dot(t.xy ,vec2(12.9898,78.233)),\
            dot(t.yz ,vec2(12.9898,78.233)),\
            dot(t.zx ,vec2(12.9898,78.233))\
          );\
          return fract(sin(dots) * 43758.5453);\
        }\
        void main() {\
            vec3 pos = texture2D(texture, texCoord).xyz-0.5;\
            vec3 disp = texture2D(displacement_texture, texCoord).xyz-0.5;\
            vec3 home=vec3(texCoord,0.0);\
            vec3 uvw=(pos+disp)+home;\
            vec3 n=noise3(uvw)-0.5;\
            pos+=noise*n/100.;\
            pos=mix(pos,home,homing);\
            pos+=displacement*disp;\
            gl_FragColor = vec4(pos+0.5,1.0);\
        }\
    ');

		// generate grid mesh and particle data textures
		var w=320, h=240;
		if(!this._.particleUvs)
		{
			this._.particleUvs=[];
			var dx=1./w;
			var dy=1./h;
			for (var y=0;y<=1.0;y+=dy) {
				for (var x=0;x<=1.0;x+=dx) {
					this._.particleUvs.push(x,y);
				}
			}
			gl.particles.attributes({_texCoord:this._.particleUvs},{_texCoord:2});

			// generate particle data double buffer
			if ( !gl.getExtension( 'OES_texture_float' ) ) alert( 'Float textures not supported' );
			if(!this._.particleTextureA) {
				this._.particleTextureA=new Texture(w,h, gl.RGBA, gl.FLOAT);
				this._.particleTextureB=new Texture(w,h, gl.RGBA, gl.FLOAT);
			}
		}

		this._.particleTextureB.swapWith(this._.particleTextureA);

		gl.particle_update.uniforms({
			homing:homing,
			noise:noise,
			displacement:displacement
		});
		var texture=this.stack_pop();
		texture.use(0);
		this._.particleTextureB.use(1);
		gl.particle_update.textures({displacement_texture: 0, texture: 1});

		this._.particleTextureA.drawTo(function() { gl.particle_update.drawRect(); });




		// perspective projection matrix
		var proj=mat4.perspective(45.,this.width/this.height,1.,100.);
		// camera placement transformation matrix
		var matrix=mat4.identity();
		mat4.translate(matrix,[0,0,-2.]);
		mat4.rotate(matrix,anglex,[1.0,0.0,0.0]);
		mat4.rotate(matrix,angley,[0.0,1.0,0.0]);
		mat4.rotate(matrix,anglez,[0.0,0.0,1.0]);
		mat4.translate(matrix,[-1.,-1.,0]);
		mat4.scale(matrix,[2.0,2.0,2.0]);
		mat4.multiply(proj,matrix,matrix);


		// set shader parameters
		gl.particles.uniforms({
			matrix:matrix,
			strength:strength,
			size:size
		});

		// set shader textures
		this._.particleTextureA.use(0);
		this._.texture.use(1);

		gl.particles.textures({particles: 0, texture: 1});

		// render 3d mesh stored in vertices,uvs to spare texture
		this._.spareTexture.drawTo(function() {
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.particles.drawTriangles(gl.POINTS);
			gl.disable(gl.DEPTH_TEST);
		},true);
		// replace current texture by spare texture
		this._.spareTexture.swapWith(this._.texture);

		this._.texture.unuse(1);

		return this;
	}

// src/filters/video/transform.js
	function transform(x,y,scale,angle) {
		gl.transform = gl.transform || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 translation;\
        uniform vec4 xform;\
        varying vec2 texCoord;\
        uniform vec2 aspect;\
        void main() {\
          mat2 mat=mat2(xform.xy,xform.zw);\
          vec2 uv=(mat*(texCoord*aspect+translation-vec2(0.5,0.5))+vec2(0.5,0.5))/aspect; \
          if(uv.x>=0. && uv.y>=0. && uv.x<=1. && uv.y<=1.) \
            gl_FragColor = texture2D(texture,uv);\
          else \
            gl_FragColor = vec4(0.,0.,0.,0.); \
        }\
    ');

		simpleShader.call(this, gl.transform, {
			translation: [x,y],
			xform: [
				Math.cos(angle)/scale, Math.sin(angle)/scale,
				-Math.sin(angle)/scale, Math.cos(angle)/scale
			],
			aspect:[this.width/this.height,1.]
		});

		return this;
	}


// src/filters/video/spectrogram.js
	function spectrogram()
	{
		var values=audio_engine.spectrogram;
		if(!values) return;

		if(!this._.spectrogramTexture)
			this._.spectrogramTexture=new Texture(values.length,1,gl.LUMINANCE,gl.UNSIGNED_BYTE);

		this._.spectrogramTexture.load(values);

		this._.spectrogramTexture.use();
		this._.texture.drawTo(function() {
			Shader.getDefaultShader().drawRect();
		});

		return this;
	}

// src/filters/video/motion.js
	function motion(threshold,interval,damper) {
		gl.motionBlend = gl.motionBlend || new Shader(null, '\
        uniform sampler2D texture;\
        uniform sampler2D motionTexture;\
        uniform float blend;\
        varying vec2 texCoord;\
        void main() {\
            vec4 original = texture2D(texture, texCoord);\
            vec4 feedback = texture2D(motionTexture, texCoord);\
            gl_FragColor = mix(original, feedback, blend);\
        }\
    ');

		gl.motion = gl.motion || new Shader(null, '\
        uniform sampler2D texture;\
        uniform sampler2D motionTexture;\
        uniform float threshold;\
        varying vec2 texCoord;\
        void main() {\
            vec4 original = texture2D(texture, texCoord);\
            vec4 background = texture2D(motionTexture, texCoord);\
            float d=length(original.rgb-background.rgb);\
            gl_FragColor = d>threshold ? original : vec4(0.0,0.0,0.0,0.0);  \
        }\
    ');

		var t=this._.texture;
		if(!this._.motionTexture)
			this._.motionTexture=new Texture(t.width,t.height,t.format,t.type);
		this._.motionTexture.ensureFormat(this._.texture);

		if(!this._.motionCycle || this._.motionCycle>interval)
		{
			// blend current image into mean motion texture
			this._.motionTexture.use(1);
			gl.motionBlend.textures({
				motionTexture: 1
			});
			simpleShader.call(this, gl.motionBlend, {
				blend: damper
			},this._.texture,this._.motionTexture);
			this._.motionTexture.unuse(1);

			this._.motionCycle=0;
		}
		this._.motionCycle++;

		// rebind, motionTexture was exchanged by simpleShader
		this._.motionTexture.use(1);
		gl.motion.textures({
			motionTexture: 1
		});
		simpleShader.call(this, gl.motion, {
			threshold: threshold
		});
		this._.motionTexture.unuse(1);

		return this;
	}

// src/filters/video/blend_alpha.js
	function blend_alpha() {
		gl.blend_alpha = gl.blend_alpha || new Shader(null, '\
        uniform sampler2D texture1;\
        uniform sampler2D texture2;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color1 = texture2D(texture1, texCoord);\
            vec4 color2 = texture2D(texture2, texCoord);\
            gl_FragColor = mix(color1, color2, color2.a);\
        }\
    ');

		var texture1=this.stack_pop();
		texture1.use(1);
		gl.blend_alpha.textures({texture1: 0, texture1: 1});
		simpleShader.call(this, gl.blend_alpha, {});
		texture1.unuse(1);

		return this;
	}

// src/filters/video/colorDisplacement.js
	function colorDisplacement(angle,amplitude) {
		gl.colorDisplacement = gl.colorDisplacement || new Shader(null,'\
    \
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        uniform vec2 texSize;\
        uniform float angle;\
        uniform float amplitude;\
      void main(void){ \
        float pi=3.14159; \
        vec2 p3=vec2(pi*2./3.,pi*2./3.); \
        vec2 angles=vec2(angle,angle+pi/2.); \
        vec2 or=sin(angles+0.*p3)/texSize*amplitude; \
        vec2 og=sin(angles+1.*p3)/texSize*amplitude; \
        vec2 ob=sin(angles+2.*p3)/texSize*amplitude; \
        gl_FragColor=vec4( \
            texture2D(texture,texCoord+or).r, \
            texture2D(texture,texCoord+og).g, \
            texture2D(texture,texCoord+ob).b, \
        1.0); \
        } \
    ');

		simpleShader.call(this, gl.colorDisplacement, {
			angle: angle,
			amplitude: amplitude,
			texSize: [this.width, this.height]
		});

		return this;
	}

// src/filters/fun/posterize.js

	function posterize(steps) {
		gl.posterize = gl.posterize || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float steps;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            gl_FragColor = vec4(floor(color.rgb*(steps+vec3(1.)))/steps, color.a);\
        }\
    ');

		simpleShader.call(this, gl.posterize, { steps: Math.round(steps) });

		return this;
	}

// src/filters/fun/dotscreen.js
	/**
	 * @filter        Dot Screen
	 * @description   Simulates a black and white halftone rendering of the image by multiplying
	 *                pixel values with a rotated 2D sine wave pattern.
	 * @param centerX The x coordinate of the pattern origin.
	 * @param centerY The y coordinate of the pattern origin.
	 * @param angle   The rotation of the pattern in radians.
	 * @param size    The diameter of a dot in pixels.
	 */
	function dotScreen(centerX, centerY, angle, size) {
		gl.dotScreen = gl.dotScreen || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float angle;\
        uniform float scale;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        \
        float pattern() {\
            float s = sin(angle), c = cos(angle);\
            vec2 tex = texCoord * texSize - center;\
            vec2 point = vec2(\
                c * tex.x - s * tex.y,\
                s * tex.x + c * tex.y\
            ) * scale;\
            return (sin(point.x) * sin(point.y)) * 4.0;\
        }\
        \
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            float average = (color.r + color.g + color.b) / 3.0;\
            gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);\
        }\
    ');

		simpleShader.call(this, gl.dotScreen, {
			center: [centerX, centerY],
			angle: angle,
			scale: Math.PI / size,
			texSize: [this.width, this.height]
		});

		return this;
	}

// src/filters/fun/mirror.js
	/**
	 * @filter           Mirror
	 * @description      mirror rhe image horizontaly
	 */
	function mirror() {
		gl.mirror = gl.mirror || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float brightness;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, vec2(1.0 - texCoord.x,texCoord.y));\
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.mirror, {
		});

		return this;
	}
// src/filters/fun/hsv.js
	/**
	 * @description  transform image to HSV
	 */

	function toHSV() {
		gl.toHSV = gl.toHSV || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            if (texCoord.y > 0.5){\
            float min = color.r;\
            float max = color.r;\
\
            if (color.g < min){\
                min = color.g;\
            }   \
            if (color.g > max){\
                max = color.g;\
            }\
            if (color.b < min){\
                min = color.b;\
            }\
            if (color.b > max){\
                max = color.b;\
            }\
\
            float delta = max - min;\
            float s = 0.0;\
            float h = 0.0;\
            float v = max;\
            if (max != 0.0) {\
                s = delta / max;\
                if (color. r == max) {\
                    h = (color.g - color.b) / delta;\
                }\
                else if (color.g == max){\
                    h = 2.0 + (color.b - color.r) / delta;\
                }\
                else {\
                    h = 4.0 + (color.r - color.g) / delta;\
                }\
                h = h * 60.0;\
                if (h < 0.0)\
                    h = h + 360.0;\
            }\
            color.r = h / 360.0;\
            color.g = s;\
            color.b = v;\
        }\
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.toHSV, {

		});

		return this;
	}
// src/filters/fun/ink.js
	/**
	 * @filter         Ink
	 * @description    Simulates outlining the image in ink by darkening edges stronger than a
	 *                 certain threshold. The edge detection value is the difference of two
	 *                 copies of the image, each blurred using a blur of a different radius.
	 * @param strength The multiplicative scale of the ink edges. Values in the range 0 to 1
	 *                 are usually sufficient, where 0 doesn't change the image and 1 adds lots
	 *                 of black edges. Negative strength values will create white ink edges
	 *                 instead of black ones.
	 */
	function ink(strength) {
		gl.ink = gl.ink || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float strength;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec2 dx = vec2(1.0 / texSize.x, 0.0);\
            vec2 dy = vec2(0.0, 1.0 / texSize.y);\
            vec4 color = texture2D(texture, texCoord);\
            float bigTotal = 0.0;\
            float smallTotal = 0.0;\
            vec3 bigAverage = vec3(0.0);\
            vec3 smallAverage = vec3(0.0);\
            for (float x = -2.0; x <= 2.0; x += 1.0) {\
                for (float y = -2.0; y <= 2.0; y += 1.0) {\
                    vec3 sample = texture2D(texture, texCoord + dx * x + dy * y).rgb;\
                    bigAverage += sample;\
                    bigTotal += 1.0;\
                    if (abs(x) + abs(y) < 2.0) {\
                        smallAverage += sample;\
                        smallTotal += 1.0;\
                    }\
                }\
            }\
            vec3 edge = max(vec3(0.0), bigAverage / bigTotal - smallAverage / smallTotal);\
            gl_FragColor = vec4(color.rgb - dot(edge, edge) * strength * 100000.0, color.a);\
        }\
    ');

		simpleShader.call(this, gl.ink, {
			strength: strength * strength * strength * strength * strength,
			texSize: [this.width, this.height]
		});

		return this;
	}

// src/filters/fun/colorhalftone.js
	/**
	 * @filter        Color Halftone
	 * @description   Simulates a CMYK halftone rendering of the image by multiplying pixel values
	 *                with a four rotated 2D sine wave patterns, one each for cyan, magenta, yellow,
	 *                and black.
	 * @param centerX The x coordinate of the pattern origin.
	 * @param centerY The y coordinate of the pattern origin.
	 * @param angle   The rotation of the pattern in radians.
	 * @param size    The diameter of a dot in pixels.
	 */
	function colorHalftone(centerX, centerY, angle, size) {
		gl.colorHalftone = gl.colorHalftone || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float angle;\
        uniform float scale;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        \
        float pattern(float angle) {\
            float s = sin(angle), c = cos(angle);\
            vec2 tex = texCoord * texSize - center;\
            vec2 point = vec2(\
                c * tex.x - s * tex.y,\
                s * tex.x + c * tex.y\
            ) * scale;\
            return (sin(point.x) * sin(point.y)) * 4.0;\
        }\
        \
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            vec3 cmy = 1.0 - color.rgb;\
            float k = min(cmy.x, min(cmy.y, cmy.z));\
            cmy = (cmy - k) / (1.0 - k);\
            cmy = clamp(cmy * 10.0 - 3.0 + vec3(pattern(angle + 0.26179), pattern(angle + 1.30899), pattern(angle)), 0.0, 1.0);\
            k = clamp(k * 10.0 - 5.0 + pattern(angle + 0.78539), 0.0, 1.0);\
            gl_FragColor = vec4(1.0 - cmy - k, color.a);\
        }\
    ');

		simpleShader.call(this, gl.colorHalftone, {
			center: [centerX, centerY],
			angle: angle,
			scale: Math.PI / size,
			texSize: [this.width, this.height]
		});

		return this;
	}

// src/filters/fun/sobel.js
	/**
	 * @description Sobel implementation of image with alpha and line color control
	 * @param secondary (0 to 1), indice of sobel strength
	 * @param coef (0 to 1), indice of sobel strength coeficient
	 * @param alpha (0 to 1) how strong is the sobel result draw in top of image. (0 image is unchanged, 1 image is replace by sobel representation)
	 * @param r (0 to 1) R chanel color of the sobel line
	 * @param g (0 to 1) G chanel color of the sobel line
	 * @param b (0 to 1) B chanel color of the sobel line
	 * @param a (0 to 1) alpha chanel color of the sobel line
	 * @param r2 (0 to 1) R chanel color of the sobel area
	 * @param g2 (0 to 1) G chanel color of the sobel area
	 * @param b2 (0 to 1) B chanel color of the sobel area
	 * @param a2 (0 to 1) alpha chanel color of the sobel area
	 */

	function sobel(secondary, coef, alpha, r,g,b,a, r2,g2,b2, a2) {
		gl.sobel = gl.sobel || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float alpha;\
        uniform float r;\
        uniform float g;\
        uniform float b;\
        uniform float r2;\
        uniform float g2;\
        uniform float b2;\
        uniform float a2;\
        uniform float a;\
        uniform float secondary;\
        uniform float coef;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            float bottomLeftIntensity = texture2D(texture, texCoord + vec2(-0.0015625, 0.0020833)).r;\
            float topRightIntensity = texture2D(texture, texCoord + vec2(0.0015625, -0.0020833)).r;\
            float topLeftIntensity = texture2D(texture, texCoord + vec2(-0.0015625, 0.0020833)).r;\
            float bottomRightIntensity = texture2D(texture, texCoord + vec2(0.0015625, 0.0020833)).r;\
            float leftIntensity = texture2D(texture, texCoord + vec2(-0.0015625, 0)).r;\
            float rightIntensity = texture2D(texture, texCoord + vec2(0.0015625, 0)).r;\
            float bottomIntensity = texture2D(texture, texCoord + vec2(0, 0.0020833)).r;\
            float topIntensity = texture2D(texture, texCoord + vec2(0, -0.0020833)).r;\
            float h = -secondary * topLeftIntensity - coef * topIntensity - secondary * topRightIntensity + secondary * bottomLeftIntensity + coef * bottomIntensity + secondary * bottomRightIntensity;\
            float v = -secondary * bottomLeftIntensity - coef * leftIntensity - secondary * topLeftIntensity + secondary * bottomRightIntensity + coef * rightIntensity + secondary * topRightIntensity;\
\
            float mag = length(vec2(h, v));\
            if (mag < 0.5) {\
                float al = alpha * a;\
                color.rgb *= (1.0 - al);\
                color.r += r * al;\
                color.g += g * al;\
                color.b += b * al;\
                color.rgb += al * mag;\
            } else { \
                float al = alpha * a2;\
                color.rgb *= (1.0 - al);\
                color.r += r2 * al;\
                color.g += g2 * al;\
                color.b += b2 * al;\
                color.rgb += al * mag;\
            }\
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.sobel, {
			secondary : secondary,
			coef : coef,
			alpha : alpha,
			r : r,
			g : g,
			b : b,
			a : a,
			r2 : r2,
			g2 : g2,
			b2 : b2,
			a2: a2
		});

		return this;
	}

// src/filters/fun/hexagonalpixelate.js
	/**
	 * @filter        Hexagonal Pixelate
	 * @description   Renders the image using a pattern of hexagonal tiles. Tile colors
	 *                are nearest-neighbor sampled from the centers of the tiles.
	 * @param centerX The x coordinate of the pattern center.
	 * @param centerY The y coordinate of the pattern center.
	 * @param scale   The width of an individual tile, in pixels.
	 */
	function hexagonalPixelate(centerX, centerY, scale) {
		gl.hexagonalPixelate = gl.hexagonalPixelate || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float scale;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec2 tex = (texCoord * texSize - center) / scale;\
            tex.y /= 0.866025404;\
            tex.x -= tex.y * 0.5;\
            \
            vec2 a;\
            if (tex.x + tex.y - floor(tex.x) - floor(tex.y) < 1.0) a = vec2(floor(tex.x), floor(tex.y));\
            else a = vec2(ceil(tex.x), ceil(tex.y));\
            vec2 b = vec2(ceil(tex.x), floor(tex.y));\
            vec2 c = vec2(floor(tex.x), ceil(tex.y));\
            \
            vec3 TEX = vec3(tex.x, tex.y, 1.0 - tex.x - tex.y);\
            vec3 A = vec3(a.x, a.y, 1.0 - a.x - a.y);\
            vec3 B = vec3(b.x, b.y, 1.0 - b.x - b.y);\
            vec3 C = vec3(c.x, c.y, 1.0 - c.x - c.y);\
            \
            float alen = length(TEX - A);\
            float blen = length(TEX - B);\
            float clen = length(TEX - C);\
            \
            vec2 choice;\
            if (alen < blen) {\
                if (alen < clen) choice = a;\
                else choice = c;\
            } else {\
                if (blen < clen) choice = b;\
                else choice = c;\
            }\
            \
            choice.x += choice.y * 0.5;\
            choice.y *= 0.866025404;\
            choice *= scale / texSize;\
            gl_FragColor = texture2D(texture, choice + center / texSize);\
        }\
    ');

		simpleShader.call(this, gl.hexagonalPixelate, {
			center: [centerX, centerY],
			scale: scale,
			texSize: [this.width, this.height]
		});

		return this;
	}

// src/filters/fun/edgework.js
	/**
	 * @filter       Edge Work
	 * @description  Picks out different frequencies in the image by subtracting two
	 *               copies of the image blurred with different radii.
	 * @param radius The radius of the effect in pixels.
	 */
	function edgeWork(radius) {
		gl.edgeWork1 = gl.edgeWork1 || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        void main() {\
            vec2 color = vec2(0.0);\
            vec2 total = vec2(0.0);\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec3 sample = texture2D(texture, texCoord + delta * percent).rgb;\
                float average = (sample.r + sample.g + sample.b) / 3.0;\
                color.x += average * weight;\
                total.x += weight;\
                if (abs(t) < 15.0) {\
                    weight = weight * 2.0 - 1.0;\
                    color.y += average * weight;\
                    total.y += weight;\
                }\
            }\
            gl_FragColor = vec4(color / total, 0.0, 1.0);\
        }\
    ');
		gl.edgeWork2 = gl.edgeWork2 || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        void main() {\
            vec2 color = vec2(0.0);\
            vec2 total = vec2(0.0);\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec2 sample = texture2D(texture, texCoord + delta * percent).xy;\
                color.x += sample.x * weight;\
                total.x += weight;\
                if (abs(t) < 15.0) {\
                    weight = weight * 2.0 - 1.0;\
                    color.y += sample.y * weight;\
                    total.y += weight;\
                }\
            }\
            float c = clamp(10000.0 * (color.y / total.y - color.x / total.x) + 0.5, 0.0, 1.0);\
            gl_FragColor = vec4(c, c, c, 1.0);\
        }\
    ');

		simpleShader.call(this, gl.edgeWork1, {
			delta: [radius / this.width, 0]
		});
		simpleShader.call(this, gl.edgeWork2, {
			delta: [0, radius / this.height]
		});

		return this;
	}

// src/filters/fun/invertcolor.js
	/**
	 * @description Invert the colors!
	 */

	function invertColor() {
		gl.invertColor = gl.invertColor || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            color.rgb = 1.0 - color.rgb;\
            gl_FragColor = color;\
        }\
    ');
		simpleShader.call(this, gl.invertColor, {});
		return this;
	}
// src/filters/adjust/color.js
	/**
	 * @filter           Color
	 * @description      Give more or less importance to a color
	 * @param alpha      0 to 1 Importance of the color modification
	 * @param r          0 to 1 Importance of the Red Chanel modification
	 * @param g          0 to 1 Importance of the Green Chanel modification
	 * @param b          0 to 1 Importance of the Blue Chanel modification
	 */
	function color(alpha,r,g,b) {
		gl.color = gl.color || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float r;\
        uniform float g;\
        uniform float b;\
        uniform float a;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            color.r += r * a;\
            color.g += g * a;\
            color.b += b * a;\
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.color, {
			r  : r,
			g  : g,
			b  : b,
			a  : alpha
		});

		return this;
	}
// src/filters/adjust/unsharpmask.js
	/**
	 * @filter         Unsharp Mask
	 * @description    A form of image sharpening that amplifies high-frequencies in the image. It
	 *                 is implemented by scaling pixels away from the average of their neighbors.
	 * @param radius   The blur radius that calculates the average of the neighboring pixels.
	 * @param strength A scale factor where 0 is no effect and higher values cause a stronger effect.
	 */
	function unsharpMask(radius, strength) {
		gl.unsharpMask = gl.unsharpMask || new Shader(null, '\
        uniform sampler2D blurredTexture;\
        uniform sampler2D originalTexture;\
        uniform float strength;\
        uniform float threshold;\
        varying vec2 texCoord;\
        void main() {\
            vec4 blurred = texture2D(blurredTexture, texCoord);\
            vec4 original = texture2D(originalTexture, texCoord);\
            gl_FragColor = mix(blurred, original, 1.0 + strength);\
        }\
    ');

		// Store a copy of the current texture in the second texture unit
		this._.extraTexture.ensureFormat(this._.texture);
		this._.texture.use();
		this._.extraTexture.drawTo(function() {
			Shader.getDefaultShader().drawRect();
		});

		// Blur the current texture, then use the stored texture to detect edges
		this._.extraTexture.use(1);
		this.triangleBlur(radius);
		gl.unsharpMask.textures({
			originalTexture: 1
		});
		simpleShader.call(this, gl.unsharpMask, {
			strength: strength
		});
		this._.extraTexture.unuse(1);

		return this;
	}

// src/filters/adjust/levels.js
// min:0.0,gamma:1.0,max:1.0, r_min:0.0,g_min:0.0,b_min:0.0, r_gamma:1.0,g_gamma:1.0,b_gamma:1.0, r_max:1.0,g_max:1.0,b_max:1.0
	function levels(min,gamma,max, r_min,g_min,b_min, r_gamma,g_gamma,b_gamma, r_max,g_max,b_max) {
		gl.levels = gl.levels || new Shader(null, '\
        varying vec2 texCoord;\
        uniform sampler2D texture;\
        uniform vec3 rgb_min; \
        uniform vec3 rgb_gamma; \
        uniform vec3 rgb_max; \
        void main()\
        {\
            vec4 color = texture2D(texture, texCoord);\
            color.rgb-=rgb_min;\
            color.rgb/=(rgb_max-rgb_min);\
            color.rgb=clamp(color.rgb,0.0,1.0);\
            color.rgb = pow(color.rgb, rgb_gamma);\
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.levels, {
			rgb_min:[r_min+min,g_min+min,b_min+min],
			rgb_gamma:[r_gamma*gamma,g_gamma*gamma,b_gamma*gamma],
			rgb_max:[r_max+max-1.,g_max+max-1.,b_max+max-1.]
		});

		return this;
	}

// src/filters/adjust/huesaturation.js
	/**
	 * @filter           Hue / Saturation
	 * @description      Provides rotational hue and multiplicative saturation control. RGB color space
	 *                   can be imagined as a cube where the axes are the red, green, and blue color
	 *                   values. Hue changing works by rotating the color vector around the grayscale
	 *                   line, which is the straight line from black (0, 0, 0) to white (1, 1, 1).
	 *                   Saturation is implemented by scaling all color channel values either toward
	 *                   or away from the average color channel value.
	 * @param hue        -1 to 1 (-1 is 180 degree rotation in the negative direction, 0 is no change,
	 *                   and 1 is 180 degree rotation in the positive direction)
	 * @param saturation -1 to 1 (-1 is solid gray, 0 is no change, and 1 is maximum contrast)
	 */
	function hueSaturation(hue, saturation) {
		gl.hueSaturation = gl.hueSaturation || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float hue;\
        uniform float saturation;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            \
            /* hue adjustment, wolfram alpha: RotationTransform[angle, {1, 1, 1}][{x, y, z}] */\
            float angle = hue * 3.14159265;\
            float s = sin(angle), c = cos(angle);\
            vec3 weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;\
            float len = length(color.rgb);\
            color.rgb = vec3(\
                dot(color.rgb, weights.xyz),\
                dot(color.rgb, weights.zxy),\
                dot(color.rgb, weights.yzx)\
            );\
            \
            /* saturation adjustment */\
            float average = (color.r + color.g + color.b) / 3.0;\
            if (saturation > 0.0) {\
                color.rgb += (average - color.rgb) * (1.0 - 1.0 / (1.001 - saturation));\
            } else {\
                color.rgb += (average - color.rgb) * (-saturation);\
            }\
            \
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.hueSaturation, {
			hue: clamp(-1, hue, 1),
			saturation: clamp(-1, saturation, 1)
		});

		return this;
	}

// src/filters/adjust/sepia.js
	/**
	 * @filter         Sepia
	 * @description    Gives the image a reddish-brown monochrome tint that imitates an old photograph.
	 * @param amount   0 to 1 (0 for no effect, 1 for full sepia coloring)
	 */
	function sepia(amount) {
		gl.sepia = gl.sepia || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float amount;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            float r = color.r;\
            float g = color.g;\
            float b = color.b;\
            \
            color.r = min(1.0, (r * (1.0 - (0.607 * amount))) + (g * (0.769 * amount)) + (b * (0.189 * amount)));\
            color.g = min(1.0, (r * 0.349 * amount) + (g * (1.0 - (0.314 * amount))) + (b * 0.168 * amount));\
            color.b = min(1.0, (r * 0.272 * amount) + (g * 0.534 * amount) + (b * (1.0 - (0.869 * amount))));\
            \
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.sepia, {
			amount: clamp(0, amount, 1)
		});

		return this;
	}

// src/filters/adjust/skin.js
	/**
	 * @filter         Skin
	 * @description    Filters-out pixels not matching skin color.
	 * from:
	 * Human skin color clustering for face detection
	 * J. Kovac, P. Peer, F. Solina - 2003
	 */
	function skin() {
		gl.skin = gl.skin || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            float r = color.r;\
            float g = color.g;\
            float b = color.b;\
            \
            if ((r>45.0/255.0)&&(g>40.0/255.0)&&(b>20.0/255.0)\
                &&(r>g)&&(r>b)\
                &&(r-min(g,b)>15.0/255.0)\
                &&(abs(r-g)>15.0/255.0)){\
                gl_FragColor = color;\
            } else {\
                gl_FragColor = vec4(0.0,0.0,0.0,color.a);\
            }\
        }\
    ');

		simpleShader.call(this, gl.skin, {
			amount: clamp(0, 1)
		});

		return this;
	}

// src/filters/adjust/noise.js
	/**
	 * @filter         Noise
	 * @description    Adds black and white noise to the image.
	 * @param amount   0 to 1 (0 for no effect, 1 for maximum noise)
	 */
	function noise(amount) {
		gl.noise = gl.noise || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float amount;\
        varying vec2 texCoord;\
        float rand(vec2 co) {\
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\
        }\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            \
            float diff = (rand(texCoord) - 0.5) * amount;\
            color.r += diff;\
            color.g += diff;\
            color.b += diff;\
            \
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.noise, {
			amount: clamp(0, amount, 1)
		});

		return this;
	}

// src/filters/adjust/denoise.js
	/**
	 * @filter         Denoise
	 * @description    Smooths over grainy noise in dark images using an 9x9 box filter
	 *                 weighted by color intensity, similar to a bilateral filter.
	 * @param exponent The exponent of the color intensity difference, should be greater
	 *                 than zero. A value of zero just gives an 9x9 box blur and high values
	 *                 give the original image, but ideal values are usually around 10-20.
	 */
	function denoise(exponent) {
		// Do a 9x9 bilateral box filter
		gl.denoise = gl.denoise || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float exponent;\
        uniform float strength;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec4 center = texture2D(texture, texCoord);\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            for (float x = -4.0; x <= 4.0; x += 1.0) {\
                for (float y = -4.0; y <= 4.0; y += 1.0) {\
                    vec4 sample = texture2D(texture, texCoord + vec2(x, y) / texSize);\
                    float weight = 1.0 - abs(dot(sample.rgb - center.rgb, vec3(0.25)));\
                    weight = pow(weight, exponent);\
                    color += sample * weight;\
                    total += weight;\
                }\
            }\
            gl_FragColor = color / total;\
        }\
    ');

		// Perform two iterations for stronger results
		for (var i = 0; i < 2; i++) {
			simpleShader.call(this, gl.denoise, {
				exponent: Math.max(0, exponent),
				texSize: [this.width, this.height]
			});
		}

		return this;
	}

// src/filters/adjust/vignette.js
	/**
	 * @filter         Vignette
	 * @description    Adds a simulated lens edge darkening effect.
	 * @param size     0 to 1 (0 for center of frame, 1 for edge of frame)
	 * @param amount   0 to 1 (0 for no effect, 1 for maximum lens darkening)
	 */
	function vignette(size, amount) {
		gl.vignette = gl.vignette || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float size;\
        uniform float amount;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            \
            float dist = distance(texCoord, vec2(0.5, 0.5));\
            color.rgb *= smoothstep(0.8, size * 0.799, dist * (amount + size));\
            \
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.vignette, {
			size: clamp(0, size, 1),
			amount: clamp(0, amount, 1)
		});

		return this;
	}

// src/filters/adjust/curves.js
	function splineInterpolate(points) {
		var interpolator = new SplineInterpolator(points);
		var array = [];
		for (var i = 0; i < 256; i++) {
			array.push(clamp(0, Math.floor(interpolator.interpolate(i / 255) * 256), 255));
		}
		return array;
	}

	/**
	 * @filter      Curves
	 * @description A powerful mapping tool that transforms the colors in the image
	 *              by an arbitrary function. The function is interpolated between
	 *              a set of 2D points using splines. The curves filter can take
	 *              either one or three arguments which will apply the mapping to
	 *              either luminance or RGB values, respectively.
	 * @param red   A list of points that define the function for the red channel.
	 *              Each point is a list of two values: the value before the mapping
	 *              and the value after the mapping, both in the range 0 to 1. For
	 *              example, [[0,1], [1,0]] would invert the red channel while
	 *              [[0,0], [1,1]] would leave the red channel unchanged. If green
	 *              and blue are omitted then this argument also applies to the
	 *              green and blue channels.
	 * @param green (optional) A list of points that define the function for the green
	 *              channel (just like for red).
	 * @param blue  (optional) A list of points that define the function for the blue
	 *              channel (just like for red).
	 */
	function curves(red, green, blue) {
		// Create the ramp texture
		red = splineInterpolate(red);
		if (arguments.length == 1) {
			green = blue = red;
		} else {
			green = splineInterpolate(green);
			blue = splineInterpolate(blue);
		}
		var array = [];
		for (var i = 0; i < 256; i++) {
			array.splice(array.length, 0, red[i], green[i], blue[i], 255);
		}
		this._.extraTexture.initFromBytes(256, 1, array);
		this._.extraTexture.use(1);

		gl.curves = gl.curves || new Shader(null, '\
        uniform sampler2D texture;\
        uniform sampler2D map;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            color.r = texture2D(map, vec2(color.r)).r;\
            color.g = texture2D(map, vec2(color.g)).g;\
            color.b = texture2D(map, vec2(color.b)).b;\
            gl_FragColor = color;\
        }\
    ');

		gl.curves.textures({
			map: 1
		});
		simpleShader.call(this, gl.curves, {});

		return this;
	}

// src/filters/adjust/vibrance.js
	/**
	 * @filter       Vibrance
	 * @description  Modifies the saturation of desaturated colors, leaving saturated colors unmodified.
	 * @param amount -1 to 1 (-1 is minimum vibrance, 0 is no change, and 1 is maximum vibrance)
	 */
	function vibrance(amount) {
		gl.vibrance = gl.vibrance || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float amount;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            float average = (color.r + color.g + color.b) / 3.0;\
            float mx = max(color.r, max(color.g, color.b));\
            float amt = (mx - average) * (-amount * 3.0);\
            color.rgb = mix(color.rgb, vec3(mx), amt);\
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.vibrance, {
			amount: clamp(-1, amount, 1)
		});

		return this;
	}

// src/filters/adjust/brightnesscontrast.js
	/**
	 * @filter           Brightness / Contrast
	 * @description      Provides additive brightness and multiplicative contrast control.
	 * @param brightness -1 to 1 (-1 is solid black, 0 is no change, and 1 is solid white)
	 * @param contrast   -1 to 1 (-1 is solid gray, 0 is no change, and 1 is maximum contrast)
	 */
	function brightnessContrast(brightness, contrast) {
		gl.brightnessContrast = gl.brightnessContrast || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float brightness;\
        uniform float contrast;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            color.rgb += brightness;\
            if (contrast > 0.0) {\
                color.rgb = (color.rgb - 0.5) / (1.0 - contrast) + 0.5;\
            } else {\
                color.rgb = (color.rgb - 0.5) * (1.0 + contrast) + 0.5;\
            }\
            gl_FragColor = color;\
        }\
    ');

		simpleShader.call(this, gl.brightnessContrast, {
			brightness: clamp(-1, brightness, 1),
			contrast: clamp(-1, contrast, 1)
		});

		return this;
	}

// src/core/texture.js
	var Texture = (function() {
		Texture.fromElement = function(element) {
			var texture = new Texture(0, 0, gl.RGB, gl.UNSIGNED_BYTE);
			texture.loadContentsOf(element);
			return texture;
		};

		function Texture(width, height, format, type) {
			this.gl = gl;
			this.id = gl.createTexture();
			this.width = width;
			this.height = height;
			this.format = format;
			this.type = type;

			gl.bindTexture(gl.TEXTURE_2D, this.id);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			if (width && height) gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
		}

		Texture.prototype.load = function(data) {
			gl.bindTexture(gl.TEXTURE_2D, this.id);
			gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.width, this.height, 0, this.format, this.type, data);
		};

		Texture.prototype.loadContentsOf = function(element) {
			this.width = element.width || element.videoWidth;
			this.height = element.height || element.videoHeight;
			gl.bindTexture(gl.TEXTURE_2D, this.id);
			gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, element);
		};

		Texture.prototype.initFromBytes = function(width, height, data) {
			this.width = width;
			this.height = height;
			this.format = gl.RGBA;
			this.type = gl.UNSIGNED_BYTE;
			gl.bindTexture(gl.TEXTURE_2D, this.id);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, this.type, new Uint8Array(data));
		};

		Texture.prototype.destroy = function() {
			gl.deleteTexture(this.id);
			this.id = null;
		};

		Texture.prototype.use = function(unit) {
			gl.activeTexture(gl.TEXTURE0 + (unit || 0));
			gl.bindTexture(gl.TEXTURE_2D, this.id);
		};

		Texture.prototype.unuse = function(unit) {
			gl.activeTexture(gl.TEXTURE0 + (unit || 0));
			gl.bindTexture(gl.TEXTURE_2D, null);
		};

		Texture.prototype.ensureFormat = function(width, height, format, type) {
			// allow passing an existing texture instead of individual arguments
			if (arguments.length == 1) {
				var texture = arguments[0];
				width = texture.width;
				height = texture.height;
				format = texture.format;
				type = texture.type;
			}

			// change the format only if required
			if (width != this.width || height != this.height || format != this.format || type != this.type) {
				this.width = width;
				this.height = height;
				this.format = format;
				this.type = type;
				gl.bindTexture(gl.TEXTURE_2D, this.id);
				gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
			}
		};

		Texture.prototype.drawTo = function(callback,with_depth) {
			// start rendering to this texture
			gl.framebuffer = gl.framebuffer || gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, gl.framebuffer);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);

			if(with_depth)
			{
				if(!this.depthbuffer)
				{
					this.depthbuffer=gl.createRenderbuffer();
					gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthbuffer);
					gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
				}
				gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthbuffer);
			}

			// TODO this forces GPU sync it seems, CPU is waiting.
			// If removed, the load seem to show off on another GL feedback method (eg. getParameter) .
			/*if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('incomplete framebuffer');
        }*/
			var base_viewport=gl.current_viewport;
			gl.viewport(0, 0, this.width, this.height);
			gl.current_viewport=[0, 0, this.width, this.height];

			// do the drawing
			callback();

			// stop rendering to this texture
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.current_viewport=base_viewport;
		};

		var canvas = null;

		function getCanvas(texture) {
			if (canvas == null) canvas = document.createElement('canvas');
			canvas.width = texture.width;
			canvas.height = texture.height;
			var c = canvas.getContext('2d');
			c.clearRect(0, 0, canvas.width, canvas.height);
			return c;
		}

		Texture.prototype.fillUsingCanvas = function(callback) {
			callback(getCanvas(this));
			this.format = gl.RGBA;
			this.type = gl.UNSIGNED_BYTE;
			gl.bindTexture(gl.TEXTURE_2D, this.id);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
			return this;
		};

		Texture.prototype.toImage = function(image) {
			this.use();
			Shader.getDefaultShader().drawRect();
			var size = this.width * this.height * 4;
			var pixels = new Uint8Array(size);
			var c = getCanvas(this);
			var data = c.createImageData(this.width, this.height);
			gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
			for (var i = 0; i < size; i++) {
				data.data[i] = pixels[i];
			}
			c.putImageData(data, 0, 0);
			image.src = canvas.toDataURL();
		};

		Texture.prototype.swapWith = function(other) {
			var temp;
			temp = other.id; other.id = this.id; this.id = temp;
			temp = other.width; other.width = this.width; this.width = temp;
			temp = other.height; other.height = this.height; this.height = temp;
			temp = other.format; other.format = this.format; this.format = temp;
		};

		return Texture;
	})();

// src/core/canvas.js
	var gl;

	/** sets default arguments **/
	function pick(arg, def) {
		return (typeof arg == 'undefined' ? def : arg);
	}

	function clamp(lo, value, hi) {
		return Math.max(lo, Math.min(value, hi));
	}

	function wrapTexture(texture) {
		return {
			_: texture,
			loadContentsOf: function(element) {
				// Make sure that we're using the correct global WebGL context
				gl = this._.gl;
				this._.loadContentsOf(element);
			},
			destroy: function() {
				// Make sure that we're using the correct global WebGL context
				gl = this._.gl;
				this._.destroy();
			}
		};
	}

	function texture(element) {
		return wrapTexture(Texture.fromElement(element));
	}

	function initialize(width, height) {
		var type = gl.UNSIGNED_BYTE;

		// Go for floating point buffer textures if we can, it'll make the bokeh
		// filter look a lot better. Note that on Windows, ANGLE does not let you
		// render to a floating-point texture when linear filtering is enabled.
		// See http://crbug.com/172278 for more information.
		if (gl.getExtension('OES_texture_float') && gl.getExtension('OES_texture_float_linear')) {
			var testTexture = new Texture(100, 100, gl.RGBA, gl.FLOAT);
			try {
				// Only use gl.FLOAT if we can render to it
				testTexture.drawTo(function() { type = gl.FLOAT; });
			} catch (e) {
			}
			testTexture.destroy();
		}

		if (this._.texture) this._.texture.destroy();
		if (this._.spareTexture) this._.spareTexture.destroy();
		this.width = width;
		this.height = height;
		gl.current_viewport=[0, 0, width, height]; // our own viewport cache
		this._.texture = new Texture(width, height, gl.RGBA, type);
		this._.spareTexture = new Texture(width, height, gl.RGBA, type);
		this._.extraTexture = this._.extraTexture || new Texture(0, 0, gl.RGBA, type);
		this._.flippedShader = this._.flippedShader || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            gl_FragColor = texture2D(texture, vec2(texCoord.x, 1.0 - texCoord.y));\
        }\
    ');
		this._.isInitialized = true;
	}

	/*
   Draw a texture to the canvas, with an optional width and height to scale to.
   If no width and height are given then the original texture width and height
   are used.
*/
	function draw(texture, width, height) {
		if (!this._.isInitialized || texture._.width != this.width || texture._.height != this.height) {
			initialize.call(this, width ? width : texture._.width, height ? height : texture._.height);
		}

		texture._.use();
		this._.texture.drawTo(function() {
			Shader.getDefaultShader().drawRect();
		});

		return this;
	}

	function update() {
		this._.texture.use();
		this._.flippedShader.drawRect();
		return this;
	}

	function simpleShader(shader, uniforms, textureIn, textureOut) {
		(textureIn || this._.texture).use();
		this._.spareTexture.drawTo(function() {
			shader.uniforms(uniforms).drawRect();
		});
		this._.spareTexture.swapWith(textureOut || this._.texture);
	}

	function replace(node) {
		node.parentNode.insertBefore(this, node);
		node.parentNode.removeChild(node);
		return this;
	}

	function contents() {
		var texture = new Texture(this._.texture.width, this._.texture.height, gl.RGBA, gl.UNSIGNED_BYTE);
		this._.texture.use();
		texture.drawTo(function() {
			Shader.getDefaultShader().drawRect();
		});
		return wrapTexture(texture);
	}

	/*
   Get a Uint8 array of pixel values: [r, g, b, a, r, g, b, a, ...]
   Length of the array will be width * height * 4.
*/
	function getPixelArray() {
		var w = this._.texture.width;
		var h = this._.texture.height;
		var array = new Uint8Array(w * h * 4);
		this._.texture.drawTo(function() {
			gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, array);
		});
		return array;
	}

	function wrap(func) {
		return function() {
			// Make sure that we're using the correct global WebGL context
			gl = this._.gl;

			// Now that the context has been switched, we can call the wrapped function
			return func.apply(this, arguments);
		};
	}

	exports.canvas = function(options) {

		options = pick(options, {});
		options.alpha = pick(options.alpha, false);
		options.premultipliedAlpha = pick(options.premultipliedAlpha, false);

		var canvas = document.createElement('canvas');
		try {
			gl = canvas.getContext('experimental-webgl', options);
		} catch (e) {
			gl = null;
		}
		if (!gl) {
			throw 'This browser does not support WebGL';
		}
		canvas._ = {
			gl: gl,
			isInitialized: false,
			texture: null,
			spareTexture: null,
			flippedShader: null
		};

		// Core methods
		canvas.texture = wrap(texture);
		canvas.initialize=wrap(initialize);
		canvas.draw = wrap(draw);
		canvas.update = wrap(update);
		canvas.replace = wrap(replace);
		canvas.contents = wrap(contents);
		canvas.getPixelArray = wrap(getPixelArray);

		// Filter methods
		canvas.brightnessContrast = wrap(brightnessContrast);
		canvas.hexagonalPixelate = wrap(hexagonalPixelate);
		canvas.hueSaturation = wrap(hueSaturation);
		canvas.colorHalftone = wrap(colorHalftone);
		canvas.triangleBlur = wrap(triangleBlur);
		canvas.fastBlur = wrap(fastBlur);
		canvas.unsharpMask = wrap(unsharpMask);
		canvas.perspective = wrap(perspective);
		canvas.matrixWarp = wrap(matrixWarp);
		canvas.bulgePinch = wrap(bulgePinch);
		canvas.tiltShift = wrap(tiltShift);
		canvas.dotScreen = wrap(dotScreen);
		canvas.edgeWork = wrap(edgeWork);
		canvas.lensBlur = wrap(lensBlur);
		canvas.erode = wrap(erode);
		canvas.dilate = wrap(dilate);
		canvas.zoomBlur = wrap(zoomBlur);
		canvas.noise = wrap(noise);
		canvas.denoise = wrap(denoise);
		canvas.curves = wrap(curves);
		canvas.swirl = wrap(swirl);
		canvas.ink = wrap(ink);
		canvas.vignette = wrap(vignette);
		canvas.vibrance = wrap(vibrance);
		canvas.sepia = wrap(sepia);
		// dronus' filter methods
		canvas.capture = wrap(capture);
		canvas.video = wrap(video);
		canvas.stack_prepare=wrap(stack_prepare);
		canvas.stack_push=wrap(stack_push);
		canvas.stack_pop=wrap(stack_pop);
		canvas.stack_swap=wrap(stack_swap);
		canvas.blend=wrap(blend);
		canvas.blend_alpha=wrap(blend_alpha);
		canvas.colorkey=wrap(colorkey);
		canvas.colorkeyv2=wrap(colorkeyv2);
		canvas.lumakey=wrap(lumakey);
		canvas.displacement=wrap(displacement);
		canvas.mesh_displacement=wrap(mesh_displacement);
		canvas.patch_displacement=wrap(patch_displacement);
		canvas.particles=wrap(particles);
		canvas.posterize=wrap(posterize);
//    canvas.=wrap();
		canvas.superquadric=wrap(superquadric);
		canvas.supershape=wrap(supershape);
		canvas.feedbackIn = wrap(feedbackIn);
		canvas.feedbackOut = wrap(feedbackOut);
		canvas.grid = wrap(grid);
		canvas.kaleidoscope = wrap(kaleidoscope);
		canvas.tile = wrap(tile);
		canvas.denoisefast = wrap(denoisefast);
		canvas.localContrast=wrap(localContrast);
		canvas.preview=wrap(preview);
		canvas.life=wrap(life);
		canvas.smoothlife=wrap(smoothlife);
		canvas.ripple=wrap(ripple);
		canvas.colorDisplacement=wrap(colorDisplacement);
		canvas.analogize=wrap(analogize);
		canvas.motion=wrap(motion);
		canvas.gauze=wrap(gauze);
		canvas.mandelbrot=wrap(mandelbrot);
		canvas.timeshift=wrap(timeshift);
		canvas.reaction=wrap(reaction);
		canvas.relief=wrap(relief);
		canvas.transform=wrap(transform);
		canvas.polygon = wrap(polygon);
		canvas.matte = wrap(matte);
		canvas.waveform=wrap(waveform);
		canvas.spectrogram=wrap(spectrogram);
		// hexapode's filters methods
		canvas.color = wrap(color);
		canvas.levels = wrap(levels);
		canvas.absolute = wrap(absolute);
		canvas.rainbow = wrap(rainbow);
		canvas.sobel = wrap(sobel);
		canvas.toHSV = wrap(toHSV);
		canvas.invertColor = wrap(invertColor);
		canvas.noalpha = wrap(noalpha);
		canvas.mirror = wrap(mirror);

		return canvas;
	};
	exports.splineInterpolate = splineInterpolate;

// src/core/matrix.js
// from javax.media.jai.PerspectiveTransform

	function getSquareToQuad(x0, y0, x1, y1, x2, y2, x3, y3) {
		var dx1 = x1 - x2;
		var dy1 = y1 - y2;
		var dx2 = x3 - x2;
		var dy2 = y3 - y2;
		var dx3 = x0 - x1 + x2 - x3;
		var dy3 = y0 - y1 + y2 - y3;
		var det = dx1*dy2 - dx2*dy1;
		var a = (dx3*dy2 - dx2*dy3) / det;
		var b = (dx1*dy3 - dx3*dy1) / det;
		return [
			x1 - x0 + a*x1, y1 - y0 + a*y1, a,
			x3 - x0 + b*x3, y3 - y0 + b*y3, b,
			x0, y0, 1
		];
	}

	function getInverse(m) {
		var a = m[0], b = m[1], c = m[2];
		var d = m[3], e = m[4], f = m[5];
		var g = m[6], h = m[7], i = m[8];
		var det = a*e*i - a*f*h - b*d*i + b*f*g + c*d*h - c*e*g;
		return [
			(e*i - f*h) / det, (c*h - b*i) / det, (b*f - c*e) / det,
			(f*g - d*i) / det, (a*i - c*g) / det, (c*d - a*f) / det,
			(d*h - e*g) / det, (b*g - a*h) / det, (a*e - b*d) / det
		];
	}

	function multiply(a, b) {
		return [
			a[0]*b[0] + a[1]*b[3] + a[2]*b[6],
			a[0]*b[1] + a[1]*b[4] + a[2]*b[7],
			a[0]*b[2] + a[1]*b[5] + a[2]*b[8],
			a[3]*b[0] + a[4]*b[3] + a[5]*b[6],
			a[3]*b[1] + a[4]*b[4] + a[5]*b[7],
			a[3]*b[2] + a[4]*b[5] + a[5]*b[8],
			a[6]*b[0] + a[7]*b[3] + a[8]*b[6],
			a[6]*b[1] + a[7]*b[4] + a[8]*b[7],
			a[6]*b[2] + a[7]*b[5] + a[8]*b[8]
		];
	}

// src/core/spline.js
// from SplineInterpolator.cs in the Paint.NET source code

	function SplineInterpolator(points) {
		var n = points.length;
		this.xa = [];
		this.ya = [];
		this.u = [];
		this.y2 = [];

		points.sort(function(a, b) {
			return a[0] - b[0];
		});
		for (var i = 0; i < n; i++) {
			this.xa.push(points[i][0]);
			this.ya.push(points[i][1]);
		}

		this.u[0] = 0;
		this.y2[0] = 0;

		for (var i = 1; i < n - 1; ++i) {
			// This is the decomposition loop of the tridiagonal algorithm.
			// y2 and u are used for temporary storage of the decomposed factors.
			var wx = this.xa[i + 1] - this.xa[i - 1];
			var sig = (this.xa[i] - this.xa[i - 1]) / wx;
			var p = sig * this.y2[i - 1] + 2.0;

			this.y2[i] = (sig - 1.0) / p;

			var ddydx =
				(this.ya[i + 1] - this.ya[i]) / (this.xa[i + 1] - this.xa[i]) -
				(this.ya[i] - this.ya[i - 1]) / (this.xa[i] - this.xa[i - 1]);

			this.u[i] = (6.0 * ddydx / wx - sig * this.u[i - 1]) / p;
		}

		this.y2[n - 1] = 0;

		// This is the backsubstitution loop of the tridiagonal algorithm
		for (var i = n - 2; i >= 0; --i) {
			this.y2[i] = this.y2[i] * this.y2[i + 1] + this.u[i];
		}
	}

	SplineInterpolator.prototype.interpolate = function(x) {
		var n = this.ya.length;
		var klo = 0;
		var khi = n - 1;

		// We will find the right place in the table by means of
		// bisection. This is optimal if sequential calls to this
		// routine are at random values of x. If sequential calls
		// are in order, and closely spaced, one would do better
		// to store previous values of klo and khi.
		while (khi - klo > 1) {
			var k = (khi + klo) >> 1;

			if (this.xa[k] > x) {
				khi = k;
			} else {
				klo = k;
			}
		}

		var h = this.xa[khi] - this.xa[klo];
		var a = (this.xa[khi] - x) / h;
		var b = (x - this.xa[klo]) / h;

		// Cubic spline polynomial is now evaluated.
		return a * this.ya[klo] + b * this.ya[khi] +
			((a * a * a - a) * this.y2[klo] + (b * b * b - b) * this.y2[khi]) * (h * h) / 6.0;
	};

// src/core/shader.js
	var Shader = (function() {
		function isArray(obj) {
			return Object.prototype.toString.call(obj) == '[object Array]';
		}

		function isNumber(obj) {
			return Object.prototype.toString.call(obj) == '[object Number]';
		}

		function compileSource(type, source) {
			var shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				throw 'compile error: ' + gl.getShaderInfoLog(shader);
			}
			return shader;
		}

		var defaultVertexSource = '\
    attribute vec2 vertex;\
    attribute vec2 _texCoord;\
    varying vec2 texCoord;\
    void main() {\
        texCoord = _texCoord;\
        gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);\
    }';

		var defaultFragmentSource = '\
    uniform sampler2D texture;\
    varying vec2 texCoord;\
    void main() {\
        gl_FragColor = texture2D(texture, texCoord);\
    }';

		function Shader(vertexSource, fragmentSource) {
			this.vertexAttribute = null;
			this.texCoordAttribute = null;
			this._attributes={};
			this._element_count=0;
			this.program = gl.createProgram();
			vertexSource = vertexSource || defaultVertexSource;
			fragmentSource = fragmentSource || defaultFragmentSource;
			fragmentSource = 'precision mediump float;' + fragmentSource; // annoying requirement is annoying
			gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
			gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
			gl.linkProgram(this.program);
			if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
				throw 'link error: ' + gl.getProgramInfoLog(this.program);
			}
		}

		Shader.prototype.destroy = function() {
			gl.deleteProgram(this.program);
			this.program = null;
		};

		Shader.prototype.uniforms = function(uniforms) {
			gl.useProgram(this.program);
			for (var name in uniforms) {
				if (!uniforms.hasOwnProperty(name)) continue;
				var location = gl.getUniformLocation(this.program, name);
				if (location === null) continue; // will be null if the uniform isn't used in the shader
				var value = uniforms[name];
				if (isArray(value) || ArrayBuffer.isView(value)) {
					switch (value.length) {
						case 1: gl.uniform1fv(location, new Float32Array(value)); break;
						case 2: gl.uniform2fv(location, new Float32Array(value)); break;
						case 3: gl.uniform3fv(location, new Float32Array(value)); break;
						case 4: gl.uniform4fv(location, new Float32Array(value)); break;
						case 9: gl.uniformMatrix3fv(location, false, new Float32Array(value)); break;
						case 16: gl.uniformMatrix4fv(location, false, new Float32Array(value)); break;
						default: throw 'dont\'t know how to load uniform "' + name + '" of length ' + value.length;
					}
				} else if (isNumber(value)) {
					gl.uniform1f(location, value);
				} else {
					throw 'attempted to set uniform "' + name + '" to invalid value ' + (value || 'undefined').toString();
				}
			}
			// allow chaining
			return this;
		};

		// textures are uniforms too but for some reason can't be specified by gl.uniform1f,
		// even though floating point numbers represent the integers 0 through 7 exactly
		Shader.prototype.textures = function(textures) {
			gl.useProgram(this.program);
			for (var name in textures) {
				if (!textures.hasOwnProperty(name)) continue;
				gl.uniform1i(gl.getUniformLocation(this.program, name), textures[name]);
			}
			// allow chaining
			return this;
		};

		Shader.prototype.drawRect = function(left, top, right, bottom) {
			var undefined;

			var  viewport = gl.current_viewport;

			top = top !== undefined ? (top - viewport[1]) / viewport[3] : 0;
			left = left !== undefined ? (left - viewport[0]) / viewport[2] : 0;
			right = right !== undefined ? (right - viewport[0]) / viewport[2] : 1;
			bottom = bottom !== undefined ? (bottom - viewport[1]) / viewport[3] : 1;
			if (gl.vertexBuffer == null)
				gl.vertexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ left, top, left, bottom, right, top, right, bottom ]), gl.STATIC_DRAW);

			if (gl.texCoordBuffer == null) {
				gl.texCoordBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ 0, 0, 0, 1, 1, 0, 1, 1 ]), gl.STATIC_DRAW);
			}
			if (this.vertexAttribute == null) {
				this.vertexAttribute = gl.getAttribLocation(this.program, 'vertex');
				gl.enableVertexAttribArray(this.vertexAttribute);
			}
			if (this.texCoordAttribute == null) {
				this.texCoordAttribute = gl.getAttribLocation(this.program, '_texCoord');
				gl.enableVertexAttribArray(this.texCoordAttribute);
			}
			gl.useProgram(this.program);
			gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
			gl.vertexAttribPointer(this.vertexAttribute, 2, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
			gl.vertexAttribPointer(this.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		};


		Shader.prototype.attributes=function(attributes,sizes){
			for(key in attributes)
			{
				var attribute=this._attributes[key];
				if(!attribute)
				{
					attribute={};
					attribute.buffer=gl.createBuffer();
					attribute.location=gl.getAttribLocation(this.program, key);
					attribute.size=sizes[key];
					gl.enableVertexAttribArray(attribute.location);
					this._attributes[key]=attribute;
				}

				gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attributes[key]), gl.STATIC_DRAW);
				this._element_count=attributes[key].length/attribute.size;
			}
		}

		Shader.prototype.drawTriangles = function(mode){

			gl.useProgram(this.program);
			for(key in this._attributes)
			{
				var attribute=this._attributes[key];
				gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
				gl.vertexAttribPointer(attribute.location, attribute.size, gl.FLOAT, false, 0, 0);
			}
			gl.drawArrays(typeof(mode)!='undefined' ? mode : gl.TRIANGLE_STRIP, 0, this._element_count);
		};


		Shader.getDefaultShader = function() {
			gl.defaultShader = gl.defaultShader || new Shader();
			return gl.defaultShader;
		};

		return Shader;
	})();

	return exports;
})();
