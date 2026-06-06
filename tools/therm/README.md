# therm

```
___________
__  /___  /____________________ ___
_  __/_  __ \  _ \_  ___/_  __ `__ \
/ /_ _  / / /  __/  /   _  / / / / /
\__/ /_/ /_/\___//_/    /_/ /_/ /_/
```

**Why is your Mac hot? A plain-English power & heat read for Apple Silicon.**

Activity Monitor shows instantaneous **CPU %** — pages of raw numbers, no conclusion. But heat isn't CPU %, it's **sustained power**, and the question you actually have when the fans spin up is simpler: *what app, and is it the CPU or the GPU?* `therm` answers that in one sentence.

```
  ● HOT  Blender is overheating your Mac via the GPU
     macOS is throttling to cool down

  what's using power · over 2m (peak)
    Blender           ████████  GPU   92%
    WindowServer      ██░░░░░░  GPU   18%   the display & graphics compositor
    Final Cut Pro     █░░░░░░░  CPU   41%
    coreaudiod        ░░░░░░░░  CPU   12%   macOS audio server

  CPU 9 W · GPU 34 W · ANE 0 W · total 44 W · pressure Heavy
```

When nothing's wrong it says so, and still surfaces a busy process if there is one:

```
  ● COOL  nothing's overheating — but coreaudiod (macOS audio server) is busy on the CPU (125%)

  what's using power · now
    coreaudiod        ████████  CPU  125%   macOS audio server
    duetexpertd       ██░░░░░░  CPU   24%   system activity prediction
    kernel_task       █░░░░░░░  CPU   10%   macOS kernel & thermal control
```

## Install

```
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s therm
```

Drops `therm` into `~/.local/bin/`. Single bash script, no runtime deps beyond `powermetrics` (ships with macOS), `awk`, and `pmset`. Make sure `~/.local/bin` is on your `PATH`.

There is **no `init` and nothing to tear down** — `therm` installs no daemon, no config, no sudoers rule. It just reads `powermetrics` when you run it.

### Optional: die temperatures via macmon

macOS exposes **no CPU/GPU die temperature** to command-line tools on Apple Silicon (`powermetrics` reports none — the `smc` sampler is empty). If you install [`macmon`](https://github.com/vladkens/macmon):

```
brew install macmon        # runs without sudo, reliable on Apple Silicon
```

`therm` detects it and adds a `chip: CPU 65°C · GPU 62°C` line. Without macmon, `therm` falls back to thermal **pressure** — so it stays dependency-free either way. macmon reports temps but **not fan RPM**, and macOS doesn't expose fan to userspace on Apple Silicon, so `therm` shows no fan reading; die temp + pressure already tell you when it's cooling hard.

## Usage

```
therm                  Quick snapshot — what's stressing the Mac right now
therm <duration>       Watch over a window, then summarise   (e.g. 40s · 2m · 1h)
therm watch            Watch indefinitely (ctrl-c prints the summary)
therm raw [seconds]    Dump raw powermetrics output (debugging)
therm -h | --help      Help
```

### Durations look *forward*, not back

`therm 2m` watches the **next** two minutes and then tells you what cooked it — it does **not** report the last two minutes. There's no background recorder by design (nothing installed, nothing to undo), so the tool can only observe from the moment you run it.

While observing it shows a live one-liner (elapsed / total, current draw, current top app, peak so far) so it's never a black box, then prints the final summary. `Ctrl-C` stops early and still prints the story so far. This forward-looking window is the thing Activity Monitor can't do: it *summarises* a stretch of time into "here's what heated you, and whether it's CPU or GPU."

## What you get

- **A verdict in one sentence** — `HOT` / `WARM` / `COOL`, the app responsible, and whether it's hammering the **CPU** or the **GPU**. Throttling is called out when macOS is actively limiting speed to cool down.
- **The top processes**, each tagged **CPU** or **GPU**, ranked by how hard they're working that subsystem (bar length = the number shown, so it reads top-down).
- **A plain description of each process**, so cryptic names make sense — `duetexpertd` is system scheduling, `mds` is Spotlight indexing. And since `coreaudiod` is only a proxy for whatever app opened an audio stream, therm resolves and names that app too (`coreaudiod → Spotify`) whenever one is playing — so "the audio server is busy" becomes "Spotify's audio is busy." Your own apps already explain themselves. It names the issue; it doesn't tell you what to do about it.
- **Context lines** (dim, ignorable) — raw watts (`CPU · GPU · ANE · total · pressure`), **chip die temps** (if `macmon` is installed), **battery temp**, **charging** state / adapter wattage, and **external displays**. The off-chip heat sources Activity Monitor never connects to "why is it hot," gathered in one place.

## Why it needs sudo (and what it does *not* do)

`powermetrics` is the only source on Apple Silicon for per-subsystem power, thermal pressure, and per-process GPU/energy — and it requires root. So `therm` runs `sudo -v` **once per session** (the standard password prompt), then samples. macOS caches that for ~5 minutes, so durations and back-to-back runs don't keep nagging.

Deliberately **no passwordless sudoers rule.** A `NOPASSWD: powermetrics *` wildcard would be a real local-privilege-escalation hole — `powermetrics` can write files as root (`-o`, `--format`), so a wildcard lets any process running as you clobber root-owned files without a password. `therm` keeps zero standing privilege instead. The cost is one prompt per session; the benefit is no attack surface left behind.

## How it works

1. **Capture.** Each sample is one `powermetrics` block averaged over the window:

   ```
   sudo powermetrics --samplers cpu_power,gpu_power,thermal,tasks \
       --show-process-energy --show-process-gpu -i <ms> -n 1
   ```

   A snapshot is a single block; a duration is many short blocks accumulated, tracking the **peak** power/pressure (which tells the heat story) and **averaging** per-process load (who was consistently busy).

2. **Parse.** Power lines (`CPU Power:`, `GPU Power:`, `ANE Power:`, `Combined Power`) are matched by label with `mW`→`W` normalization. The per-process table is read **positionally** — ID is the first integer field, CPU ms/s the field after it, GPU ms/s the second-to-last, Energy Impact the last — because the grouped headers (`Deadlines (…)`, `Wakeups (…)`) make header text positions diverge from the data columns. This also keeps process names with spaces intact.

3. **Verdict.** Thermal pressure is authoritative for hot/warm; while pressure is still `Nominal`, total watts is the tiebreak (busy-but-not-yet-throttled). The driving subsystem is whichever of CPU / GPU / ANE pulls the most watts; the named app is the busiest process by CPU/GPU load.

## Limitations

- **Apple Silicon first.** The power labels are the Apple-Silicon `powermetrics` schema. Intel Macs emit a different layout and some fields will read as zero.
- **Forward-only, no history.** `therm` tells you why it's hot now, or over a window you start. It can't tell you what spiked the fans 20 minutes ago while you were away. (A background recorder was deliberately left out to keep the tool install-free.)
- **Per-process numbers are utilization, not watts.** `powermetrics` doesn't attribute exact wattage per process, so the per-app figures are CPU/GPU load; the wattage total is per-subsystem.
- **Die temps are opt-in; fan RPM isn't available at all.** CPU/GPU die temperature comes only from the optional `macmon` helper (see above) — `powermetrics` reports none on Apple Silicon. Fan RPM isn't exposed to userspace tooling on Apple Silicon (even `macmon` omits it), so `therm` leans on thermal *pressure* + die temp, which already indicate when the machine is cooling hard.
- **RAM isn't a heat source here.** DRAM draws little on Apple Silicon and isn't separately reported — `therm` doesn't pretend otherwise. Heat is CPU, GPU, or the Neural Engine.
```
