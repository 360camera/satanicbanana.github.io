class StatBar {
	constructor(link_obj, link_val, link_max_obj, link_max, bar_width) {
		this.bar = null;
		this.val = null;
		this.max_parent = "stats";
		
		if (bar_width) {
			this.bar_width = bar_width;
		} else {
			this.bar_width = 160;
		}
		
		this.link_obj = link_obj;
		this.link_val = link_val;
		this.link_max_obj = link_max_obj;
		this.link_max = link_max;
	}
	
	set_max_parent(parent) {
		this.max_parent = parent;
	}
	
	relink(link_obj, link_val, link_max_obj, link_max) {
		this.link_obj = link_obj;
		this.link_val = link_val;
		this.link_max_obj = link_max_obj;
		this.link_max = link_max;
		
		this.update();
	}
	
	bindToObjects(bar, val) {
		this.bar = bar;
		this.val = val;
	}
	
	update() {
		if (this.bar != null && this.link_obj != null) {
			var val_get = this.link_obj[this.link_val];
			var max_val_get;
			if (this.max_parent) {
				max_val_get = this.link_max_obj[this.max_parent][this.link_max];
			} else {
				max_val_get = this.link_max_obj[this.link_max];
			}
			
			this.val.textContent = format_bonus_number(Math.max(0, val_get)) + " / " + format_bonus_number(max_val_get);
			this.bar.style.width = Math.round((Math.max(0, val_get) / max_val_get) * this.bar_width);
		}
	}
}


class StatLabel {
	constructor(link_obj, link_val, parent_val) {
		this.val = null;
		
		this.link_obj = link_obj;
		this.link_val = link_val;
		this.parent_val = parent_val;
	}
	
	relink(link_obj, link_val) {
		this.link_obj = link_obj;
		this.link_val = link_val;
		
		this.update();
	}
	
	bindToObjects(val) {
		this.val = val;
	}
	
	update() {
		if (this.val != null && this.link_obj != null) {
			var val_get;
			if (this.parent_val) {
				val_get = this.link_obj[this.parent_val][this.link_val];
			} else {
				val_get = this.link_obj[this.link_val];
			}
			
			this.val.textContent = format_bonus_number(val_get);
		}
	}
}



static_bars = []


function setup_static_bars() {
	player_hpbar = new StatBar(player, "current_hp", player, "hp");
	player_mpbar = new StatBar(player, "current_mp", player, "mp");
	player_xpbar = new StatBar(player, "xp", player, "xp_required", 144);
	player_xpbar.set_max_parent(null);
	
	player_atk_label = new StatLabel(player, "atk", "stats");
	player_def_label = new StatLabel(player, "def", "stats");
	player_agi_label = new StatLabel(player, "agi", "stats");
	player_luc_label = new StatLabel(player, "luc", "stats");
	player_lvl_label = new StatLabel(player, "level");
	
	enemy_hpbar = new StatBar();
	
	player_hpbar.bindToObjects(document.getElementById("combat-hpbar-1"), document.getElementById("combat-hpbar-2"));
	player_mpbar.bindToObjects(document.getElementById("combat-mpbar-1"), document.getElementById("combat-mpbar-2"));
	
	player_atk_label.bindToObjects(document.getElementById("combat-stat-atk"));
	player_def_label.bindToObjects(document.getElementById("combat-stat-def"));
	player_agi_label.bindToObjects(document.getElementById("combat-stat-agi"));
	player_luc_label.bindToObjects(document.getElementById("combat-stat-luc"));
	player_lvl_label.bindToObjects(document.getElementById("combat-stat-level"));
	
	enemy_hpbar.bindToObjects(document.getElementById("combat-enemyhp-1"), document.getElementById("combat-enemyhp-2"));
	
	player_xpbar.bindToObjects(document.getElementById("combat-xpbar-1"), document.getElementById("combat-xpbar-2"));
	
	static_bars.push(player_hpbar);
	static_bars.push(player_mpbar);
	
	static_bars.push(enemy_hpbar);
		
	static_bars.push(player_atk_label);
	static_bars.push(player_def_label);
	static_bars.push(player_agi_label);
	static_bars.push(player_luc_label);
	static_bars.push(player_lvl_label);
	
	static_bars.push(player_xpbar);
}


function update_static_bars() {
	static_bars.forEach(item => {
		item.update();
	});
}


function refresh_enemy_spawn_time(time) {
	document.getElementById("combat-battle-wait-amount").textContent = Math.round(time / 20).toString().toHHMMSS();
}


function show_enemy_screen() {
	document.getElementById("combat-waiting-info").style.visibility = "hidden";
	document.getElementById("combat-enemy-info").style.visibility = "visible";
}


function show_wait_screen() {
	document.getElementById("combat-waiting-info").style.visibility = "visible";
	document.getElementById("combat-enemy-info").style.visibility = "hidden";
}