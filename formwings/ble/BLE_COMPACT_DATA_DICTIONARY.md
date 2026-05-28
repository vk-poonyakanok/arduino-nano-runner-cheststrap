# FormWings BLE Compact Data Dictionary

Compact BLE packets are JSON objects optimized for 64-byte BLE notifications from the UNO Q bridge.
The dashboard accepts both this compact format and the legacy verbose `running_form_prediction` format.

## Packet Shape

Example:

```json
{"t":"p","w":170,"ts":1688.12,"c":0,"vo":0,"gb":0,"lr":0,"ln":0.1,"la":0,"hs":0.22,"g":0,"ft":0,"pf":1,"tp":0,"fb":1,"ds":0,"f":1,"pg":0.172,"pb":0.828,"df":"vo","et":24.5,"eh":48,"ei":24.5,"er":"n","es":17,"ea":1.4,"rs":"ok","rc":"thermal_ok"}
```

## Top-Level Fields

| Key | Verbose field | Unit | Meaning |
|---|---|---:|---|
| `t` | `type` | - | Packet type. `p` = running form prediction. |
| `w` | `window_id` | - | Monotonic model prediction window id. |
| `ts` | `timestamp_s` | s | Sensor/model timestamp. |
| `f` | `class` | - | Form class. `0` = Good, `1` = Bad Form. |
| `pg` | `probabilities.Good` | 0-1 | Model probability for Good. |
| `pb` | `probabilities["Bad Form"]` | 0-1 | Model probability for Bad Form. |
| `df` | `dominant_feature` | code | Dominant model feature code. |

## Feature Fields

| Key | Verbose field | Unit | Meaning |
|---|---|---:|---|
| `c` | `features.cadence_spm` | spm | Cadence. |
| `vo` | `features.vertical_oscillation_cm` | cm | Vertical oscillation. |
| `gb` | `features.gct_flight_balance_ms` | ms | Ground contact minus flight time balance. |
| `lr` | `features.impact_loading_rate_bw_s` | BW/s | Impact loading rate. |
| `ln` | `features.trunk_forward_lean_deg` | deg | Trunk forward lean. |
| `la` | `features.left_right_asymmetry_pct` | % | Left/right asymmetry. |
| `hs` | `features.heel_strike_likelihood` | 0-1 | Heel-strike likelihood. |

## Diagnostic Fields

| Key | Verbose field | Unit | Meaning |
|---|---|---:|---|
| `g` | `diagnostics.gct_ms` | ms | Ground contact time. |
| `ft` | `diagnostics.flight_time_ms` | ms | Flight time. |
| `pf` | `diagnostics.peak_vgrf_bw_estimate` | xBW | Estimated peak vertical ground reaction force. |
| `tp` | `diagnostics.footstrike_time_to_peak_ms` | ms | Footstrike time to peak impact. |
| `fb` | `diagnostics.fallback_window` | 0/1 | `1` when the model used fallback window logic. |
| `ds` | `diagnostics.detected_step_events` | count | Detected step events in the model window. |

## Environment Fields

| Key | Verbose field | Unit | Meaning |
|---|---|---:|---|
| `st` | `environment.status` | code | Sensor status code. |
| `et` | `environment.temperature_c` | deg C | Ambient temperature. |
| `eh` | `environment.humidity_pct` | % | Relative humidity. |
| `ei` | `environment.heat_index_c` | deg C | Heat index. |
| `er` | `environment.risk_state` | code | Heat risk state code. |
| `es` | `environment.risk_score` | 0-100 | Heat risk score. |
| `ea` | `environment.age_s` | s | Age of thermal reading. |

## Alert And Message Fields

| Key | Verbose field | Unit | Meaning |
|---|---|---:|---|
| `ps` | `priority_trigger.severity` | code | Metric trigger severity. |
| `pc` | `priority_trigger.code` | code | Metric trigger advice code. |
| `pv` | `priority_trigger.value` | metric unit | Trigger value. |
| `px` | `priority_trigger.threshold` | metric unit | Trigger threshold. |
| `rs` | `recommendation.severity` | code | Thermal recommendation severity. |
| `rc` | `recommendation.code` | code | Encoded thermal device message. |

## Code Tables

### Dominant Feature Codes

| Code | Verbose value |
|---|---|
| `c` | `cadence_spm` |
| `vo` | `vertical_oscillation_cm` |
| `gb` | `gct_flight_balance_ms` |
| `lr` | `impact_loading_rate_bw_s` |
| `ln` | `trunk_forward_lean_deg` |
| `la` | `left_right_asymmetry_pct` |
| `hs` | `heel_strike_likelihood` |

### Environment Status Codes

| Code | Verbose value |
|---|---|
| `ok` | `ok` |
| `u` | `unavailable` |
| `s` | `stale` |

### Risk State Codes

| Code | Verbose value |
|---|---|
| `n` | `Normal` |
| `c` | `Caution` |
| `w` | `Warning` |
| `d` | `Danger` |

### Severity Codes

| Code | Verbose value |
|---|---|
| `ok` | `OK` |
| `warn` | `WARN` |
| `alert` | `ALERT` |
| `crit` | `CRIT` |

### Device Message Codes

| Code | Dashboard message |
|---|---|
| `thermal_ok` | Thermal conditions look normal. |
| `heat_caution` | Warm humid conditions; control pace and hydrate. |
| `heat_warning` | Heat risk elevated; reduce pace and avoid hard intervals. |
| `heat_critical` | Heat risk high; slow down, hydrate, and consider stopping. |
| `thermal_stale` | Thermal reading is stale. |
| `thermal_missing` | Thermal sensor unavailable. |

