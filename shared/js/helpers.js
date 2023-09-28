function vh(percent) {
    // topbar, bottombar 128px + 64px

    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    return (percent * (h - 128 - 64)) / 100;
}

function vw(percent) {
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    return (percent * w) / 100;
}

function vmin(percent) {
    return Math.min(vh(percent), vw(percent));
}

function vmax(percent) {
    return Math.max(vh(percent), vw(percent));
}

function in_rect(tl, br, pos) {
    return (
        pos.x >= tl.x && pos.x <= br.x &&
        pos.y >= tl.y && pos.y <= br.y
    )
}

function positive_mod(n, m) {
    return ((n % m) + m) % m;
}

// http://rosettacode.org/wiki/Bitmap/Bresenham%27s_line_algorithm#C
function make_line(a, b, bound_rect) {
    // need to later make radius too, which should just be a diamond from every point
    // pretty simple but im lazy rn

    let x0 = a.x;
    let y0 = a.y;

    let x1 = b.x;
    let y1 = b.y;

    let coords = [];
    let dx = Math.abs(x1-x0);
    let sx = x0<x1 ? 1 : -1;
    let dy = Math.abs(y1-y0);
    let sy = y0<y1 ? 1 : -1; 
    let err = (dx>dy ? dx : -dy)/2;
    let e2 = 0;

    while (true) {
        if (x0 != a.x || y0 != a.y) {
            let coord = new Vector2(x0, y0);

            coords.push(coord);
        }

        if ((x0==x1 && y0==y1) || (bound_rect && !in_rect(bound_rect.tl, bound_rect.br, new Vector2(x0, y0)))) {
            //coords.push(b);
            return coords;
        }

        e2 = err;
        if (e2 >-dx) { err -= dy; x0 += sx; }
        if (e2 < dy) { err += dx; y0 += sy; }
    }
}

function random_int(min_inclusive, max_exclusive) {
    return min_inclusive + Math.floor(Math.random() * (max_exclusive - min_inclusive));
}

function lerp(from, to, amt, round=false) {
    let diff = to - from;

    if (round) {
        return Math.round(from + (diff * amt));
    } else {
        return from + (diff * amt);
    }
}

function lerp_arr(from, to, amt, round=false) {
    return from.map((v, i) => lerp(v, to[i], amt, round));
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(arr) {
    return arr
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
}

const NumberFormat = {
    SCIENTIFIC: 0
}

function format_number(val, typ, max_val=1e6) {
    let method = typ ? typ : NumberFormat.SCIENTIFIC;

    switch (method) {
        case NumberFormat.SCIENTIFIC:
            if (val >= max_val && val > 0) {
                let magnitude = Math.log10(val);
                let digits = Math.floor(magnitude);
                
                let frac = Math.floor((val / Math.pow(10, digits)) * 100) / 100;
                
                return `${frac}e${digits}`;
            } else if (Math.abs(val) >= max_val) {
                let magnitude = Math.log10(Math.abs(val));
                let digits = Math.floor(magnitude);
                
                let frac = Math.floor((Math.abs(val) / Math.pow(10, digits)) * 100) / 100;
                
                return `-${frac}e${digits}`;
            } else {
                return val.toLocaleString();
            }
            break;
    }
}

// https://stackoverflow.com/questions/33424138/how-to-remove-a-div-with-fade-out-effect-in-javascript
function removeFadeOut( el, speed ) {
    var seconds = speed/1000;
    el.style.transition = "opacity "+seconds+"s ease";

    el.style.opacity = 0;
    setTimeout(function() {
        el.parentNode.removeChild(el);
    }, speed);
}

// https://gist.github.com/mjackson/5311256
function rgbToHsv(r, g, b) {
    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if (max == min) {
        h = 0; // achromatic
    } else {
        switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    return [ h, s, v ];
}
  
function hsvToRgb(h, s, v) {
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [ r * 255, g * 255, b * 255 ];
}

// All seeded randomness from:
// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
    return [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
}

function sfc32(a, b, c, d) {
    return function(dump_values) {
        if (dump_values) {
            return [a, b, c, d]
        }

        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
        var t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

function get_seeded_randomiser(seed) {
    let seed_hash = cyrb128(seed);

    let rand = sfc32(seed_hash[0], seed_hash[1], seed_hash[2], seed_hash[3]);

    return rand;
}

function random_from_parameters(a, b, c, d) {
    return sfc32(a, b, c, d);
}

function seeded_random(seed) {
    let rand = get_seeded_randomiser(seed)

    // generate once, discard
    rand();

    // return second number
    return rand();
}

function in_bounds(val, lo, hi) {
    return val >= lo && val < hi;
}

function random_on_circle(r, rand) {
    let theta = (rand ? rand.random() : Math.random()) * 2 * Math.PI;

    let x = r * Math.cos(theta);
    let y = r * Math.sin(theta);

    return new Vector2(x, y);
}

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static from_hash_code(code) {
        return new Vector2((code-1) % 1000000, Math.floor((code-1) / 1000000));
    }

    static from_angle(angle_rad, r) {
        return new Vector2(
            Math.cos(angle_rad),
            Math.sin(angle_rad)
        ).mul(r ? r : 1)
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }

    hash_code() {
        return (this.y * 1000000) + this.x + 1;
    }

    equals(other) {
        return this.x == other.x && this.y == other.y;
    }

    copy() {
        return new Vector2(this.x, this.y);
    }

    neg() {
        return new Vector2(-this.x, -this.y);
    }

    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    sub(other) {
        return this.add(other.neg());
    }

    mul(other) {
        return new Vector2(this.x * other, this.y * other);
    }

    div(other) {
        return new Vector2(this.x / other, this.y / other);
    }

    // TODO test it works (moved sqr_magnitude into its own function from magnitude)
    sqr_magnitude() {
        return Math.pow(this.x, 2) + Math.pow(this.y, 2)
    }

    magnitude() {
        return Math.sqrt(this.sqr_magnitude());
    }

    normalize() {
        if (this.sqr_magnitude() == 0) {
            return this;
        }

        return this.div(this.magnitude());
    }

    sqr_distance(other) {
        return this.sub(other).sqr_magnitude();
    }

    distance(other) {
        return this.sub(other).magnitude();
    }

    round() {
        return new Vector2(Math.round(this.x), Math.round(this.y));
    }

    wrap(bounds) {
        return new Vector2(this.x % bounds.x, this.y % bounds.y);
    }

    rotate_towards(other, theta_max, return_angle_rotated=false) {
        let angle_diff = this.angle_between(other);

        if (Math.abs(angle_diff) >= theta_max) {
            angle_diff = theta_max * Math.sign(angle_diff);
        }

        //console.log(angle_diff)

        let result_angle = this.angle() + angle_diff;

        if (return_angle_rotated) {
            return [Vector2.from_angle(result_angle, this.magnitude()), angle_diff];
        } else {
            return Vector2.from_angle(result_angle, this.magnitude());
        }
    }

    rotate(rad) {
        return new Vector2(
            this.x * Math.cos(rad) - this.y * Math.sin(rad),
            this.x * Math.sin(rad) + this.y * Math.cos(rad),
        )
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    dot(other) {
        return (this.x * other.x) + (this.y * other.y);
    }

    angle_between(other) {
        let angle = Math.atan2(other.y, other.x) - Math.atan2(this.y, this.x);
        if (angle > Math.PI) {
            angle = -((2 * Math.PI) - angle);
        }

        if (angle < -Math.PI) {
            angle = -((-2 * Math.PI) + angle);
        }

        return angle;

        if (this.magnitude() * other.magnitude() == 0) {
            return 0;
        }25

        let dot = (this.dot(other)) / (this.magnitude() * other.magnitude())
        let dp = Math.max(-1, Math.min(1, dot));

        return Math.acos(dp);
    }

    mask(x, y) {
        return new Vector2(this.x * x, this.y * y);
    }

    divmask(x, y) {
        return new Vector2(this.x / x, this.y / y);
    }
}

class Colour {
    static from_array(arr) {
        return new Colour(
            arr[0],
            arr[1],
            arr[2],
            arr[3]
        )
    }

    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    
        this.data = Array(4);
        this.get_data();
    }

    get_data() {
        this.data[0] = this.r;
        this.data[1] = this.g;
        this.data[2] = this.b;
        this.data[3] = this.a;
    }
}