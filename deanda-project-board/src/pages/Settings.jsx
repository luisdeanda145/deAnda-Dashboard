import Icon from "../components/Icon";
import { Avatar, PageHead, Switch, Who } from "../components/ui";
import { DEFAULTS, CUSTOM_CURSOR } from "../lib/settings";
import { PILLARS, TEAM, USER, WORKSTREAMS } from "../data/board";
import { fmtDay, fmtMonth } from "../lib/format";
import { focusOf, shiftMonth } from "../lib/selectors";
import { useApp } from "../lib/store";
import { play } from "../lib/sound";

let previewTimer = 0;
import { connected, signOut } from "../lib/api";

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider">
      <span className="slider-top">
        <b>{label}</b>
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--p": `${p}%` }}
        onChange={(e) => onChange(+e.target.value)}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function Settings() {
  const {
    settings,
    set,
    toast,
    month,
    tasks,
    archive,
    go,
    manage,
    removePerson,
    removePillar,
    removeWorkstream,
    session,
  } = useApp();
  /* removals refuse while tasks still point at the thing; say why */
  const attempt = (problem, done) =>
    toast(
      problem
        ? { icon: "alert", title: "Can’t remove yet", text: problem }
        : { icon: "trash", title: "Removed", text: done },
    );

  return (
    <>
      <PageHead
        title="Settings"
        sub="The board, the team and the space around you"
      >
        <button
          type="button"
          className="cta ghost"
          onClick={() => {
            set(DEFAULTS);
            toast({ icon: "sync", title: "Defaults restored" });
          }}
        >
          Reset view
        </button>
      </PageHead>

      <div className="set-grid">
        <section className="card set-group rise" style={{ "--d": 1 }}>
          <h2>
            <Icon name="calendar" size={18} /> Board
          </h2>
          <div className="set-row">
            <div>
              <b>Reporting month</b>
              <small>
                Every page except Insights shows {fmtMonth(month)} only. On{" "}
                {fmtDay(`${shiftMonth(month, 1)}-01`)} the board resets: this
                month’s totals are saved for Insights, its completed tasks are
                cleared, and open tasks carry over.
              </small>
            </div>
            <span className="status tone-blue">{fmtMonth(month)}</span>
          </div>
          <div className="set-row">
            <div>
              <b>Archived months</b>
              <small>
                {Object.keys(archive).length
                  ? Object.keys(archive)
                      .sort()
                      .reverse()
                      .map(fmtMonth)
                      .join(", ")
                  : "None yet. The first one is archived when this month ends."}
              </small>
            </div>
            <button
              type="button"
              className="chip"
              onClick={() => go("insights")}
            >
              Insights
            </button>
          </div>
          <div className="set-row">
            <div>
              <b>Data source</b>
              <small>
                {connected
                  ? `${tasks.length} tasks on this month’s board, saved in the shared database. Changes are live for the whole team.`
                  : `${tasks.length} tasks on this month’s board from Project_Board_Nov_2026.xlsx, kept in this browser only (no database configured).`}
              </small>
            </div>
            <span className={`status tone-${connected ? "teal" : "amber"}`}>
              {connected ? "Live" : "Local"}
            </span>
          </div>
          {connected && session && (
            <div className="set-row">
              <div>
                <b>Signed in</b>
                <small>{session.user.email}</small>
              </div>
              <button type="button" className="chip" onClick={() => signOut()}>
                Sign out
              </button>
            </div>
          )}
        </section>

        <section className="card set-group rise" style={{ "--d": 2 }}>
          <h2>
            <Icon name="cube" size={18} /> Spatial layout
          </h2>
          <Slider
            label="Curvature"
            hint="How far the side panels wrap around you. You can also drag the window bar."
            value={settings.curve}
            min={0}
            max={28}
            unit="°"
            onChange={(curve) => set({ curve })}
          />
          <Slider
            label="Depth"
            hint="Lower is closer, with a stronger 3D effect."
            value={settings.depth}
            min={900}
            max={3200}
            step={50}
            unit="px"
            onChange={(depth) => set({ depth })}
          />
        </section>

        <section className="card set-group rise" style={{ "--d": 3 }}>
          <h2>
            <Icon name="sparkle" size={18} /> Glass & motion
          </h2>
          <Slider
            label="Frost"
            hint="How frosted the glass of every window is."
            value={settings.frost}
            min={6}
            max={70}
            unit="px"
            onChange={(frost) => set({ frost })}
          />
          <Slider
            label="Tint"
            hint="Darker glass keeps text legible on bright scenes."
            value={settings.tint}
            min={0}
            max={70}
            unit="%"
            onChange={(tint) => set({ tint })}
          />
          <Slider
            label="Background blur"
            hint="Softens the room photo behind the windows. 0 is sharp."
            value={settings.bgBlur}
            min={0}
            max={16}
            unit="px"
            onChange={(bgBlur) => set({ bgBlur })}
          />
          <div className="set-row">
            <div>
              <b>Sounds</b>
              <small>
                A soft tick when you switch tabs, a chime when a task is added,
                and a shimmer when the assistant opens or closes
              </small>
            </div>
            <Switch
              on={settings.sound}
              onChange={(sound) => {
                set({ sound });
                if (sound) setTimeout(() => play("tab"), 0);
              }}
              label="Sounds"
            />
          </div>
          {settings.sound && (
            <Slider
              label="Sound volume"
              hint="Plays a sample as you change it."
              value={settings.soundVolume}
              min={5}
              max={100}
              step={5}
              unit="%"
              onChange={(soundVolume) => {
                set({ soundVolume });
                /* a sample at the new level once the slider settles */
                clearTimeout(previewTimer);
                previewTimer = setTimeout(() => play("assistantOpen"), 250);
              }}
            />
          )}
          <div className="set-row">
            <div>
              <b>Animations</b>
              <small>Entrances, count-ups and transitions</small>
            </div>
            <Switch
              on={settings.motion}
              onChange={(motion) => set({ motion })}
              label="Animations"
            />
          </div>
                    {CUSTOM_CURSOR && (
              <div className="set-row">
                <div>
                  <b>Custom cursor</b>
                  <small>
                    The glowing blue ring in place of the normal pointer
                  </small>
                </div>
                <Switch
                  on={settings.cursor !== false}
                  onChange={(cursor) => set({ cursor })}
                  label="Custom cursor"
                />
              </div>
          )}
        </section>

        <section className="card set-group rise" style={{ "--d": 4 }}>
          <h2>
            <Icon name="users" size={18} /> Team
            <button
              type="button"
              className="chip sm-chip set-add"
              onClick={() => manage("person")}
            >
              <Icon name="plus" size={14} stroke={2.2} /> Add member
            </button>
          </h2>
          <ul className="roster">
            {TEAM.map((p) => (
              <li key={p.name}>
                <Avatar person={p.name} size={30} />
                <div>
                  <b>
                    <Who name={p.name} />
                    {p.name === USER.name && <em> · you</em>}
                  </b>
                  <small>{p.role || focusOf(tasks, p.name)}</small>
                </div>
                {p.name !== USER.name && (
                  <button
                    type="button"
                    className="x-btn"
                    aria-label={`Remove ${p.name}`}
                    data-tip="Remove"
                    onClick={() => attempt(removePerson(p.name), p.name)}
                  >
                    <Icon name="close" size={13} stroke={2.2} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card set-group wide rise" style={{ "--d": 5 }}>
          <h2>
            <Icon name="layers" size={18} /> Pillars & workstreams
            <button
              type="button"
              className="chip sm-chip set-add"
              onClick={() => manage("pillar")}
            >
              <Icon name="plus" size={14} stroke={2.2} /> Add pillar
            </button>
          </h2>
          <div className="pw-grid">
            {PILLARS.map((p) => (
              <div key={p.name}>
                <b>
                  <i className={`dot ${p.tone}`} /> {p.name}
                  <button
                    type="button"
                    className="x-btn"
                    aria-label={`Remove ${p.name}`}
                    data-tip="Remove pillar"
                    onClick={() => attempt(removePillar(p.name), p.name)}
                  >
                    <Icon name="close" size={13} stroke={2.2} />
                  </button>
                </b>
                <span className="tags">
                  {WORKSTREAMS.filter((w) => w.pillar === p.name).map((w) => (
                    <i key={w.name} className="tag-x">
                      {w.name}
                      <button
                        type="button"
                        aria-label={`Remove ${w.name}`}
                        onClick={() => attempt(removeWorkstream(w), w.name)}
                      >
                        <Icon name="close" size={11} stroke={2.4} />
                      </button>
                    </i>
                  ))}
                  <button
                    type="button"
                    className="tag-add"
                    onClick={() => manage("workstream", { pillar: p.name })}
                  >
                    <Icon name="plus" size={12} stroke={2.4} /> Workstream
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
