from touchstonecal.display import display_name, normalize_event_type


def test_strips_w_suffix():
    assert display_name("Yoga for Climbers w/ Stephanie") == "Yoga for Climbers"


def test_strips_pipe_with_suffix():
    assert display_name("Lead Climbing Clinic | with August") == "Lead Climbing Clinic"


def test_strips_gym_location_suffix():
    assert display_name("Lead Climbing Clinic @ Pacific Pipe") == "Lead Climbing Clinic"
    assert display_name("Lead Climbing Clinic Pipe") == "Lead Climbing Clinic"


def test_preserves_chicks_with_grit():
    assert display_name("Chicks with Grit") == "Chicks with Grit"


def test_strips_vinyasa_instructor():
    assert display_name("Vinyasa w/ Elena") == "Vinyasa"


def test_vinyasa_variants_normalize():
    assert normalize_event_type("Vinyasa Yoga") == "Vinyasa"
    assert normalize_event_type("Vinyasa Flow") == "Vinyasa"
    assert normalize_event_type("Vinyasa Style") == "Vinyasa"
    assert normalize_event_type("Vinyasa w/ Elena") == "Vinyasa"


def test_power_vinyasa_flow_normalizes():
    assert normalize_event_type("Power Vinyasa Flow") == "Power Vinyasa"


def test_hot_vinyasa_normalizes():
    assert normalize_event_type("Hot Vinyasa with Emily") == "Hot Vinyasa"
    assert normalize_event_type("Hot Vinyasa w/ Emily") == "Hot Vinyasa"


def test_yoga_flow_normalizes():
    assert normalize_event_type("Yoga Flow") == "Yoga Flow"
    assert normalize_event_type("Yoga Flow Plus Core") == "Yoga Flow Plus Core"


def test_yoga_flow_excludes_named_instructors():
    assert normalize_event_type("Yoga Flow w/ Brianna") == "Yoga Flow w/ Brianna"
    assert normalize_event_type("Yoga Flow with Abby") == "Yoga Flow with Abby"
    assert normalize_event_type("Yoga Flow Plus Core | with Casey") == "Yoga Flow Plus Core | with Casey"


def test_strips_trailing_yoga_from_display_names():
    assert normalize_event_type("Hatha Yoga") == "Hatha"
    assert normalize_event_type("Yin Yoga") == "Yin"
    assert normalize_event_type("Restorative Yoga") == "Restorative"
    assert normalize_event_type("All Levels Acro Yoga") == "All Levels Acro"


def test_hot_yoga_preserves_full_name():
    assert normalize_event_type("Hot Yoga") == "Hot Yoga"
    assert normalize_event_type("Hot Flow Yoga") == "Hot Flow Yoga"
    assert normalize_event_type("Hot Yoga w/ Sam") == "Hot Yoga"


def test_strips_w_suffix_without_space():
    assert display_name("Rocket Yoga w/PK") == "Rocket Yoga"
    assert display_name("Vinyasa w/Elena") == "Vinyasa"


def test_preserves_yoga_for_climbers():
    assert normalize_event_type("Yoga for Climbers") == "Yoga for Climbers"
    assert normalize_event_type("Yoga for Climbers w/ Stephanie") == "Yoga for Climbers"


def test_rocket_yoga_normalizes_together():
    assert normalize_event_type("Rocket Yoga") == "Rocket Yoga"
    assert normalize_event_type("Rocket Yoga w/PK") == "Rocket Yoga"
    assert normalize_event_type("Rocket Yoga w/ PK") == "Rocket Yoga"
