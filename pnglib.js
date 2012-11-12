/**
* A handy class to calculate color values.
*
* @version 1.0
* @author Robert Eisele <robert@xarg.org>
* @copyright Copyright (c) 2010, Robert Eisele
* @link http://www.xarg.org/2010/03/generate-client-side-png-files-using-javascript/
* @license http://www.opensource.org/licenses/bsd-license.php BSD License
*
*/


define(["dojo/_base/declare"], function(declare){
    
    var construct = declare("lib.pnglib",null,{
		width:0,height:0,depth:0,
		buffer:[],palette:{},pindex:0,_crc32:[],
		pix_size:0,data_size:0,ihdr_offs:0,ihdr_size:0,
		plte_offs:0,plte_size:0,trns_offs:0,trns_size:0,
		idat_offs:0,idat_size:0,iend_offs:0,iend_size:0,
		buffer_size:0,header:0,
		
		// helper functions for that ctx
		write: function(buffer, offs) {
			for (var i = 2; i < arguments.length; i++) {
				for (var j = 0; j < arguments[i].length; j++) {
					buffer[offs++] = arguments[i].charAt(j);
				}
			}
		},

		byte2: function(w) {
			return String.fromCharCode((w >> 8) & 255, w & 255);
		},

		byte4: function(w) {
			return String.fromCharCode((w >> 24) & 255, (w >> 16) & 255, (w >> 8) & 255, w & 255);
		},

		byte2lsb: function(w) {
			return String.fromCharCode(w & 255, (w >> 8) & 255);
		},
		
		constructor: function(args) {
			this.width   = args.width;
			this.height  = args.height;
			this.depth   = args.depth;
			
			this.buffer  = new Array();
			this.palette = new Object();
			this.pindex  = 0;
			this._crc32 = new Array();

			// pixel data and row filter identifier size
			this.pix_size = this.height * (this.width + 1);

			// deflate header, pix_size, block headers, adler32 checksum
			this.data_size = 2 + this.pix_size + 5 * Math.floor((0xfffe + this.pix_size) / 0xffff) + 4;

			// offsets and sizes of Png chunks
			this.ihdr_offs = 0;									// IHDR offset and size
			this.ihdr_size = 4 + 4 + 13 + 4;
			this.plte_offs = this.ihdr_offs + this.ihdr_size;	// PLTE offset and size
			this.plte_size = 4 + 4 + 3 * this.depth + 4;
			this.trns_offs = this.plte_offs + this.plte_size;	// tRNS offset and size
			this.trns_size = 4 + 4 + this.depth + 4;
			this.idat_offs = this.trns_offs + this.trns_size;	// IDAT offset and size
			this.idat_size = 4 + 4 + this.data_size + 4;
			this.iend_offs = this.idat_offs + this.idat_size;	// IEND offset and size
			this.iend_size = 4 + 4 + 4;
			this.buffer_size  = this.iend_offs + this.iend_size;	// total PNG size

			// initialize buffer with zero bytes
			for (var i = 0; i < this.buffer_size; i++) {
				this.buffer[i] = "\x00";
			}

			// initialize non-zero elements
			this.write(this.buffer, this.ihdr_offs, this.byte4(this.ihdr_size - 12), 'IHDR', this.byte4(this.width), this.byte4(this.height), "\x08\x03");
			this.write(this.buffer, this.plte_offs, this.byte4(this.plte_size - 12), 'PLTE');
			this.write(this.buffer, this.trns_offs, this.byte4(this.trns_size - 12), 'tRNS');
			this.write(this.buffer, this.idat_offs, this.byte4(this.idat_size - 12), 'IDAT');
			this.write(this.buffer, this.iend_offs, this.byte4(this.iend_size - 12), 'IEND');

			// initialize deflate header
			this.header = ((8 + (7 << 4)) << 8) | (3 << 6);
			this.header+= 31 - (this.header % 31);

			this.write(this.buffer, this.idat_offs + 8, this.byte2(this.header));

			// initialize deflate block headers
			for (var i = 0; (i << 16) - 1 < this.pix_size; i++) {
				var size, bits;
				if (i + 0xffff < this.pix_size) {
					size = 0xffff;
					bits = "\x00";
				} else {
					size = this.pix_size - (i << 16) - i;
					bits = "\x01";
				}
				this.write(this.buffer, this.idat_offs + 8 + 2 + (i << 16) + (i << 2), bits, this.byte2lsb(size), this.byte2lsb(~size));
			}

			/* Create crc32 lookup table */
			for (var i = 0; i < 256; i++) {
				var c = i;
				for (var j = 0; j < 8; j++) {
					if (c & 1) {
						c = -306674912 ^ ((c >> 1) & 0x7fffffff);
					} else {
						c = (c >> 1) & 0x7fffffff;
					}
				}
				this._crc32[i] = c;
			}
		},
		
		// compute the index into a png for a given pixel
		index: function(x,y) {
			var i = y * (this.width + 1) + x + 1;
			var j = this.idat_offs + 8 + 2 + 5 * Math.floor((i / 0xffff) + 1) + i;
			return j;
		},
		
		edit: function(x,y,color) {
			this.buffer[this.index(x,y)] = color;
		},

		// convert a color and build up the palette
		color: function(red, green, blue, alpha) {

			alpha = alpha >= 0 ? alpha : 255;
			var color = (((((alpha << 8) | red) << 8) | green) << 8) | blue;
			if (typeof this.palette[color] == "undefined") {
				if (this.pindex == this.depth) return "\x00";

				var ndx = this.plte_offs + 8 + 3 * this.pindex;

				this.buffer[ndx + 0] = String.fromCharCode(red);
				this.buffer[ndx + 1] = String.fromCharCode(green);
				this.buffer[ndx + 2] = String.fromCharCode(blue);
				this.buffer[this.trns_offs+8+this.pindex] = String.fromCharCode(alpha);
				
				this.palette[color] = String.fromCharCode(this.pindex++);
			}
			
			return this.palette[color];
		},
		
		getBase64: function() {
			var s = this.getDump();
			var ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
			var c1, c2, c3, e1, e2, e3, e4;
			var l = s.length;
			var i = 0;
			var r = "";

			do {
				c1 = s.charCodeAt(i);
				e1 = c1 >> 2;
				c2 = s.charCodeAt(i+1);
				e2 = ((c1 & 3) << 4) | (c2 >> 4);
				c3 = s.charCodeAt(i+2);
				if (l < i+2) { e3 = 64; } else { e3 = ((c2 & 0xf) << 2) | (c3 >> 6); }
				if (l < i+3) { e4 = 64; } else { e4 = c3 & 0x3f; }
				r+= ch.charAt(e1) + ch.charAt(e2) + ch.charAt(e3) + ch.charAt(e4);
			} while ((i+= 3) < l);
			
			return r;
		},
	
		// output a PNG string
		getDump: function() {

			// compute adler32 of output pixels + row filter bytes
			var BASE = 65521; /* largest prime smaller than 65536 */
			var NMAX = 5552;  /* NMAX is the largest n such that 255n(n+1)/2 + (n+1)(BASE-1) <= 2^32-1 */
			var s1 = 1;
			var s2 = 0;
			var n = NMAX;

			for (var y = 0; y < this.height; y++) {
				for (var x = -1; x < this.width; x++) {
					s1+= this.buffer[this.index(x, y)].charCodeAt(0);
					s2+= s1;
					if ((n-= 1) == 0) {
						s1%= BASE;
						s2%= BASE;
						n = NMAX;
					}
				}
			}
			s1%= BASE;
			s2%= BASE;
			
			this.write(this.buffer, this.idat_offs + this.idat_size - 8, this.byte4((s2 << 16) | s1));

			this.crc32(this.buffer, this.ihdr_offs, this.ihdr_size);
			this.crc32(this.buffer, this.plte_offs, this.plte_size);
			this.crc32(this.buffer, this.trns_offs, this.trns_size);
			this.crc32(this.buffer, this.idat_offs, this.idat_size);
			this.crc32(this.buffer, this.iend_offs, this.iend_size);

			// convert PNG to string
			return "\211PNG\r\n\032\n"+this.buffer.join('');
		},
		
		// compute crc32 of the PNG chunks
		crc32: function (png, offs, size) {
			var crc = -1;
			for (var i = 4; i < size-4; i += 1) {
				crc = this._crc32[(crc ^ png[offs+i].charCodeAt(0)) & 0xff] ^ ((crc >> 8) & 0x00ffffff);
			}
			this.write(png, offs+size-4, this.byte4(crc ^ -1));
		}
    });
    
    return construct;
});
