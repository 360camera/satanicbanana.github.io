game_id = "dungeon";

const layer_names = [
    "front",
    "debug_front",
    "debug_back",
    "ui1",
    "ui2",
    "fg1",
    "fg2",
    "fg3",
    "bg1",
    "bg2",
    "bg3"
]

let imgs = {};

const fps = 60;

const tile_empty = new Image(320, 320);
tile_empty.src = "images/single_big/tile000.png";

const prerender_canvas = document.getElementById("hidden-prerender-canvas");
const prerender_ctx = prerender_canvas.getContext("2d");

let num_textures_loaded = 0;
let num_textures_needed = 0;

const full_texture_atlas = new Array(253).fill(0).map((v, i) => {
    let ts = [];

    for (let c=0; c<16; c++) {
        let t = new Image(320, 320);
        t.src = `images/multicoloured_big/tile${i.toString().padStart(3, "0")}-${c.toString().padStart(2, "0")}.png`

        num_textures_needed++;
        t.addEventListener("load", function() {
            num_textures_loaded++;
        })

        ts.push(t);
    }

    return ts;
});

let layers = {};
let keys_down = {};

let drag_start_pos = null;

//let zoom_scale = 0.02;  // km per pixel

let canvas_width = 256;
let canvas_height = 256;

let canvas_x = 0;
let canvas_y = 0;

let mouse_position = new Vector2(0, 0);
//let mouse_select_pos = new Vector2(0, 0);

let wtsp = null;
let stwp = null;
let canvas_zoom_factor = null;

function get_canvases() {
    layer_names.forEach(layer => {
        let c = document.getElementById("game-canvas-" + layer);

        layers[layer] = {
            canvas: c,
            ctx: c.getContext("2d")
        }
    })
}

function handle_resize(event) {
    canvas_height = Math.round(vh(90));
    canvas_width = Math.round((canvas_height * 16) / 9);

    Object.keys(layers).forEach(k => {
        let canvas = layers[k].canvas;
        let ctx = layers[k].ctx;

        canvas.style.width = canvas_width + "px";
        canvas.style.height = canvas_height + "px";
    
        ctx.canvas.width = canvas_width;
        ctx.canvas.height = canvas_height;
    
        if (vw(100) % 1 == 0) {
            canvas.style.marginLeft = "0px";
        } else {
            canvas.style.marginLeft = "0.5px";
        }

        canvas.style.left = Math.round((vw(100) - canvas_width) / 2) + "px";
        canvas.style.top = (64 + Math.round((vh(100) - canvas_height) / 2)) + "px";
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        var rect = canvas.getBoundingClientRect();
        canvas_x = rect.x;
        canvas_y = rect.y;
    })

    layers.bg3.ctx.fillStyle = "#000"
    layers.bg3.ctx.fillRect(0, 0, canvas_width, canvas_height)

    //refresh_wtsp_stwp();

    // layers.bg2.ctx.drawImage(
    //     document.getElementById("map-clean"), 0, 0, canvas_width, canvas_height
    // )
}

function render_diagnostics() {
    layers.debug_front.ctx.clearRect(0, 0, canvas_width, canvas_height);

    let avg_frame_time = last_frame_times.reduce((a, b) => a + b, 0) / last_frame_times.length;
    let fps = 1000/avg_frame_time;

    write_text(
        layers.debug_front.ctx, `fps: ${Math.round(fps)}`, 10, 16, "#fff", "MS Gothic", 12
    )

    let frame_time_splits = [render_durations, calc_durations, wait_durations].map(arr => {
        return (Math.round(100 * (arr.reduce((a,b) => a+b, 0) / (arr.length+Number.EPSILON))) / 100).toString().padEnd(6);
    })

    write_text(
        layers.debug_front.ctx, `frame spread:`, 10, 28, "#fff", "MS Gothic", 12
    )

    write_text(
        layers.debug_front.ctx, frame_time_splits[0] + "draw", 10+(6*(1+13)), 28, "#0f0", "MS Gothic", 12
    )

    write_text(
        layers.debug_front.ctx, frame_time_splits[1] + "calc", 10+(6*(1+2+13+6+4)), 28, "#f00", "MS Gothic", 12
    )

    write_text(
        layers.debug_front.ctx, frame_time_splits[2] + "wait", 10+(6*(1+2+2+13+6+4+6+4)), 28, "#666", "MS Gothic", 12
    )

    write_text(
        layers.debug_front.ctx, `avg time delta: ${Math.round(time_deltas.reduce((a,b) => a+b, 0) / (time_deltas.length+Number.EPSILON) * 100) / 100}`, 10, 40, "#fff", "MS Gothic", 12
    )
}

class TileMapTile {
    constructor(img, colour, blocks_los_hint, passable_hint) {
        this.img = img;
        this.colour = colour

        // if not provided, automatically sets to this
        this.blocks_los_hint = blocks_los_hint;
        this.passable_hint = passable_hint;
    }
}

class TileMap {
    constructor(pix_size, keys) {
        this.pix_size = pix_size;
        this.keys = new Map(Object.entries(keys));
    }

    get(id) {
        return this.keys.get(id.toString());
    }
}

class Tile {
    constructor() {
        this.tile_id = 0;
        this.entities = new Map();

        this.blocks_los = false;
        this.passable = true;
    }

    set_all(tile_id=-1, blocks_los=-1, passable=-1) {
        if (tile_id != -1) {
            this.set_tile_id(tile_id);
        }

        if (blocks_los != -1) {
            this.set_blocks_los(blocks_los);
        }

        if (passable != -1) {
            this.set_passable(passable);
        }
    }

    set_blocks_los(to) {
        this.blocks_los = to;
    }

    set_passable(to) {
        this.passable = this.passable;
    }

    set_tile_id(to) {
        this.tile_id = to;
    }

    add_entity(entity) {
        this.entities.set(entity.id, entity);
    }

    remove_entity(entity) {
        return this.entities.delete(entity.id);
    }
}

class Board {
    constructor(size) {
        if (!(size instanceof Vector2)) {
            throw TypeError("Board size must be a Vector2");
        }

        this.size = size;
        this.tiles = new Array(size.x * size.y).fill(0).map(_ => new Tile());

        this.active_tilemap = null;

        this.changed_tiles = new Set();
    }

    reset_changed_tiles() {
        this.changed_tiles.clear();
    }

    is_position_valid(pos) {
        return Number.isInteger(pos.x) &&
               Number.isInteger(pos.y) &&
               pos.x >= 0 &&
               pos.y >= 0 &&
               pos.x < this.size.x &&
               pos.y < this.size.y
    }

    position_to_flat_index(pos) {
        return (pos.y * this.size.x) + pos.x
    }

    flat_index_to_position(idx) {
        return new Vector2(
            Math.floor(idx / this.size.x),
            idx % this.size.x
        )
    }

    get_tile(pos) {
        if (this.is_position_valid(pos)) {
            return this.tiles[this.position_to_flat_index(pos)];
        } else {
            return null;
        }
    }

    set_tile(pos, tile_id, blocks_los, passable) {
        let tile = this.get_tile(pos);
        this.changed_tiles.add(pos.hash_code());

        if (tile) {
            tile.set_tile_id(tile_id);

            if (blocks_los === undefined) {
                tile.set_blocks_los(this.active_tilemap.get(tile_id).blocks_los_hint)
            }

            if (passable === undefined) {
                tile.set_passable(this.active_tilemap.get(tile_id).passable_hint)
            }
        } else {
            throw RangeError("Tried to set a tile that is out of bounds")
        }
    }

    set_pattern(tl, pattern) {
        for (let yt=0; yt<pattern.length; yt++) {
            let row = pattern[yt];
            for (let xt=0; xt<row.length; xt++) {
                this.set_tile(tl.add(new Vector2(xt, yt)), row[xt])
            }
        }
    }

    add_entity_to_tile(pos, entity) {
        let tile = this.get_tile(pos);
        tile.add_entity(entity);
    }
    
    remove_entity_from_tile(pos, entity) {
        let tile = this.get_tile(pos);
        tile.remove_entity(entity);
    }
}

function render_board(board, canvas, ctx, tilemap_override, center_pos, base_tile_size=16, zoom_level=1, draw_all=false) {
    let tilemap = tilemap_override ? tilemap_override : board.active_tilemap
    
    let canvas_center = new Vector2(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2))

    // not needed for render to basic canvas... i think
    let sprite_scale_factor = base_tile_size / tilemap.pix_size;
    
    let scaled_base_size = new Vector2(base_tile_size * zoom_level, base_tile_size * zoom_level);

    let sprite_total_size = scaled_base_size.mul(sprite_scale_factor);

    let canvas_center_tile_pos = canvas_center.sub(new Vector2(scaled_base_size.x / 2, scaled_base_size.y / 2))
    
    //console.log(sprite_scale_factor, scaled_base_size, sprite_total_size, canvas_center_tile_pos)

    // we're going to offset both backwards and forwards from the center so we need to halve the clearance
    let num_tiles_x = Math.ceil((canvas.width / scaled_base_size.x) / 2)
    let num_tiles_y = Math.ceil((canvas.height / scaled_base_size.y) / 2)

    for (let x=-num_tiles_x; x<num_tiles_x+1; x++) {
        for (let y=-num_tiles_y; y<num_tiles_y+1; y++) {
            let render_position = canvas_center_tile_pos.add(new Vector2(scaled_base_size.x * x, scaled_base_size.y * y));
            let board_position = center_pos.add(new Vector2(x, y));

            if (board.changed_tiles.has(board_position.hash_code()) || draw_all) {
                let tile = board.get_tile(board_position);

                // put the image on the canvas here using render_position
                // also need to do entities, should be visible in the tile object
                write_rotated_image(canvas, ctx, render_position.x, render_position.y, tile_empty, sprite_total_size.x, sprite_total_size.y)
                if (tile) {
                    let t = tilemap.get(tile.tile_id);
                    if (t) {
                        write_rotated_image(canvas, ctx, render_position.x, render_position.y, t.img[t.colour], sprite_total_size.x, sprite_total_size.y)
                    }
                } else {
                    // nothing
                }
            }
        }
    }

    board.reset_changed_tiles();
}

let last_frame_times = [];
let render_durations = [];
let calc_durations = [];
let wait_durations = [];
let time_deltas = [];

let last_calc_time = Date.now();
let last_frame_time = Date.now();

let board = new Board(new Vector2(256, 256));
let offset = new Vector2(127, 127);
let zoom_level = 1;

let test_tilemap = new TileMap(
    16, {
        0: new TileMapTile(full_texture_atlas[0], 15, true, true),
        1: new TileMapTile(full_texture_atlas[176], 9, true, false),
        2: new TileMapTile(full_texture_atlas[136], 2, false, false),
        3: new TileMapTile(full_texture_atlas[135], 8, false, false)
    }
)

board.active_tilemap = test_tilemap;

board.set_pattern(new Vector2(117, 117), [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
])

let need_to_redraw = true;

function game_loop() {
    let frame_start_time = Date.now();

    // render game here
    render_board(board, layers.fg3.canvas, layers.fg3.ctx, undefined, offset, 16, zoom_level, need_to_redraw);
    render_diagnostics();

    let render_end_time = Date.now();

    let calc_start_time = Date.now();
    let delta_time = calc_start_time - last_calc_time;
    last_calc_time = calc_start_time;

    // step game here
    for (let i=0; i<1; i++) {
        board.set_tile(new Vector2(
            random_int(0, 256),
            random_int(0, 256)
        ), 1)
    }

    need_to_redraw = false;

    let calc_end_time = Date.now();

    time_deltas.push(delta_time);
    time_deltas = time_deltas.slice(-120);

    render_durations.push(render_end_time - frame_start_time);
    render_durations = render_durations.slice(-120);

    calc_durations.push(calc_end_time - render_end_time);
    calc_durations = calc_durations.slice(-120);

    let frame_end_time = Date.now();
    let time_since_last_frame = frame_end_time - last_frame_time;
    last_frame_time = frame_end_time;

    last_frame_times.push(time_since_last_frame);
    last_frame_times = last_frame_times.slice(-120);

    // next frame should arrive (1000/fps) ms later, so get the time left and compare it with the end time
    let expected_next_frame = frame_start_time + (1000/fps);
    let time_to_wait = Math.max(0, expected_next_frame-last_frame_time);

    wait_durations.push(time_to_wait);
    wait_durations = wait_durations.slice(-120);

    setTimeout(game_loop, time_to_wait);
}

document.addEventListener("DOMContentLoaded", function() {
    get_canvases();

    /*
    let brushes = [];

    layer_names.forEach((k,i) => {
        let canvas = layers[k].canvas;
        let ctx = layers[k].ctx;

        ctx.imageSmoothingEnabled = false;

        let wh = 24 - ((i*2)+1);

        let brush = layers.bg3.ctx.createImageData(wh, wh);
        write_rect_to_imagedata(imgs.brush, new Vector2(0, 0), new Vector2(wh, wh), new Colour(i*25, 255, 255, 25))
        brushes.push(brush);
    })
    */

    layers.front.canvas.addEventListener("contextmenu", function(event) {
        event.preventDefault();
    })

    layers.front.canvas.addEventListener("mousemove", function(event) {
        mouse_position = new Vector2(event.clientX-canvas_x, event.clientY-canvas_y);
        //if (mouse_select_pos.x == 0 && mouse_select_pos.y == 0) {
            //mouse_select_pos = mouse_position.copy();
        //}
    });

    layers.front.canvas.addEventListener("mousedown", function(event) {
        if (event.button == 0) {
            drag_start_pos = mouse_position.copy();
        }

        event.preventDefault();
    });

    layers.front.canvas.addEventListener("mouseup", function(event) {
        /*
        if (event.button == 0) {
            if (drag_start_pos) {
                combat_control.process_dragclick(drag_start_pos, mouse_position, keys_down);

                drag_start_pos = null;
                return;
            }

            combat_control.process_mouseclick(mouse_position.copy(), keys_down);
        } else {
            combat_control.process_rightclick(mouse_position.copy(), keys_down)
        }
        */

        event.preventDefault();
    });

    document.addEventListener("keydown", (event) => {
        let name = event.key;
        let code = event.code;

        keys_down[code] = true;

        switch (code) {
            case "ArrowUp":
                offset = offset.add(new Vector2(0, -1));
                break;

            case "ArrowDown":
                offset = offset.add(new Vector2(0, 1));
                break;

            case "ArrowLeft":
                offset = offset.add(new Vector2(-1, 0));
                break;

            case "ArrowRight":
                offset = offset.add(new Vector2(1, 0));
                break;

            case "Equal":
                zoom_level += 0.25;
                break;

            case "Minus":
                zoom_level -= 0.25;
                break;
        }

        zoom_level = Math.max(0.25, zoom_level);
        need_to_redraw = true;
    });

    document.addEventListener("keyup", (event) => {
        let name = event.key;
        let code = event.code;

        keys_down[code] = false;
    });

    handle_resize();

    imgs.pixel = layers.fg2.ctx.createImageData(1, 1);
    write_rect_to_imagedata(imgs.pixel, new Vector2(0, 0), new Vector2(1, 1), new Colour(0, 255, 0, 128))

    imgs.brush = layers.fg2.ctx.createImageData(8, 8);
    write_rect_to_imagedata(imgs.brush, new Vector2(0, 0), new Vector2(8, 8), new Colour(0, 255, 0, 255))

    imgs.line = layers.fg2.ctx.createImageData(5, 1);
    write_rect_to_imagedata(imgs.brush, new Vector2(0, 0), new Vector2(5, 1), new Colour(255, 255, 255, 255));

    let interval = setInterval(function() {
        if (num_textures_loaded >= num_textures_needed) {
            document.getElementById("game-container").style.display = "";
            clearInterval(interval);
            game_loop();
        }
    }, 200)
})

window.addEventListener("resize", handle_resize)