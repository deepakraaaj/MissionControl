-- Turf booking app: the full working context for a room — project, tasks,
-- issues, diagrams, notes, leads, links and SOPs.
--
-- This lives server-side as a callable function rather than as constants in the
-- app bundle, so the client never ships (or re-seeds from) stale copies. Call it
-- once per room:
--
--   SELECT public.seed_turf_workspace('<room-uuid>');
--
-- Idempotent: ids are derived from the room, and every insert is ON CONFLICT DO
-- NOTHING, so re-running adds only what is genuinely missing.

CREATE OR REPLACE FUNCTION public.seed_turf_workspace(target_room uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  sfx  text := left(md5(target_room::text), 8);
  pid  text;
  tech text := 'Tech Lead';
  biz  text := 'BizDev Partner';
  ops  text := 'Operations Partner';
BEGIN
  IF NOT public.is_approved_room_member(target_room) THEN
    RAISE EXCEPTION 'Not an approved member of this room';
  END IF;

  pid := 'turf-' || sfx;

  -- ────────────────────────────────────────
  -- Project
  INSERT INTO public.team_projects (
    id, room_id, title, description, icon_name, color,
    objective, why_it_matters, definition_of_success,
    customer_segment, revenue_model, status, is_pinned, target_date, tags, sort_order
  ) VALUES (
    pid, target_room,
    'Turf Booking App',
    'Slot discovery, group booking and split payments for local turf and sports arenas.',
    'Activity', 'emerald',
    'Let a captain find an open slot, book it for the whole team, and collect every player''s share upfront.',
    'Turf owners lose 20-30% of weekend revenue to no-shows, and captains chase teammates for money over WhatsApp.',
    'Three venues live, 50+ online bookings a week, and over 90% of bookings fully paid before kickoff.',
    'Independent turf and sports-arena owners still running bookings through phone calls and WhatsApp groups.',
    'Monthly subscription per venue plus a small fee on completed bookings. Split payments, scoreboards and retention tools raise revenue per venue over time.',
    'active', true, '2026-09-30',
    ARRAY['Sports','B2B2C','P0-Priority','Split-Payments'], 0
  ) ON CONFLICT (id) DO NOTHING;

  -- ────────────────────────────────────────
  -- Tasks
  INSERT INTO public.team_tasks (id, room_id, project_id, title, outcome, status, priority, assignee_role, due_date, completed_at)
  VALUES
    (pid||'-t01', target_room, pid, 'Build the live slot availability grid',
     'Captain sees every open slot for the next 14 days, per pitch, with prices, updating live as others book.',
     'in_progress','critical',tech,'2026-08-26',NULL),
    (pid||'-t02', target_room, pid, 'Implement the 10-minute slot hold',
     'Selecting a slot locks it for 10 minutes with a visible countdown, then releases it automatically.',
     'in_progress','critical',tech,'2026-08-27',NULL),
    (pid||'-t03', target_room, pid, 'Generate per-player UPI split links',
     'One booking fans out into N deep links, each for that player''s exact share, tracked individually.',
     'in_progress','critical',tech,'2026-08-28',NULL),
    (pid||'-t04', target_room, pid, 'UPI webhook reconciliation with polling fallback',
     'Payments confirm within seconds; if the webhook is late, a poll settles it inside 60 seconds.',
     'review','critical',tech,'2026-08-25',NULL),
    (pid||'-t05', target_room, pid, 'Partial-payment rescue flow',
     'When only some players pay before the hold lapses, the captain can extend, cover the gap, or refund automatically.',
     'backlog','high',tech,'2026-09-02',NULL),
    (pid||'-t06', target_room, pid, 'Owner tablet dashboard for the front desk',
     'Today''s bookings, paid status per team, and a one-tap mark-arrived, readable from three feet away.',
     'in_progress','high',tech,'2026-08-30',NULL),
    (pid||'-t07', target_room, pid, 'WhatsApp booking confirmation and reminders',
     'Captain and owner get confirmation instantly, plus a reminder two hours before kickoff.',
     'backlog','high',ops,'2026-09-04',NULL),
    (pid||'-t08', target_room, pid, 'Cancellation and refund policy engine',
     'Per-venue refund windows enforced automatically, with the split refunded to each payer.',
     'backlog','high',tech,'2026-09-08',NULL),
    (pid||'-t09', target_room, pid, 'Recurring weekly slot booking',
     'Regular teams reserve the same slot every week, with one tap to skip a week.',
     'backlog','normal',tech,'2026-09-12',NULL),
    (pid||'-t10', target_room, pid, 'Live scorebook and match history',
     'Teams record scores during a match; history builds a per-team record that pulls them back.',
     'backlog','normal',tech,'2026-09-18',NULL),
    (pid||'-t11', target_room, pid, 'Venue self-onboarding wizard',
     'An owner can list pitches, hours, and pricing without us touching a spreadsheet.',
     'backlog','high',ops,'2026-09-10',NULL),
    (pid||'-t12', target_room, pid, 'Off-peak dynamic pricing',
     'Owners discount weekday mornings automatically to fill dead hours.',
     'backlog','low',biz,'2026-09-25',NULL),
    (pid||'-t13', target_room, pid, 'Instrument the booking funnel',
     'Every drop-off from slot view to full payment is measurable, so we know where captains quit.',
     'review','high',tech,'2026-08-24',NULL),
    (pid||'-t14', target_room, pid, 'Ship acrylic QR stands to pilot venues',
     'Every pilot counter has a scannable stand pointing at its own venue page.',
     'done','critical',ops,'2026-08-18','2026-08-18'),
    (pid||'-t15', target_room, pid, 'Run the first paid weekend pilot',
     'One venue takes a full weekend of real bookings and money through the platform.',
     'done','critical',biz,'2026-08-16','2026-08-17'),
    (pid||'-t16', target_room, pid, 'Migrate pilot venue''s existing bookings',
     'Six weeks of WhatsApp bookings loaded so the owner sees one calendar, not two.',
     'done','high',ops,'2026-08-14','2026-08-15')
  ON CONFLICT (id) DO NOTHING;

  -- ────────────────────────────────────────
  -- Problems / issues
  INSERT INTO public.team_problems (
    id, room_id, project_id, audience_category, title, description, source,
    severity, status, tags, logged_by, evidence, impact, next_action, owner, due_date, occurrence_count, solved_notes
  ) VALUES
    (pid||'-p01', target_room, pid, 'Turf Owner',
     'Owners will not route money through a platform account',
     'Owners assume a platform-held balance means delayed settlement, and would rather keep their personal UPI QR on the counter.',
     'Pilot venue visit','blocker','solved',ARRAY['UPI','Settlement','Trust'],biz,
     'Three of four owners raised it unprompted in the first meeting.',
     'Without direct settlement no owner signs, and the split-payment feature has nothing to attach to.',
     'Ship peer-to-peer UPI intent with the owner VPA as direct payee.',biz,'2026-08-16',4,
     'Payments now go straight to the owner''s VPA; we never hold funds, and the receipt shows their own bank credit.'),

    (pid||'-p02', target_room, pid, 'Player / Captain',
     'The last two players stall and the hold expires',
     'Six of eight pay within two minutes; the remaining two take 20+ minutes, so the slot releases and the captain has to start over.',
     'Weekend playtest','blocker','investigating',ARRAY['Payment-Timeout','Split-Logic','UX'],tech,
     'Happened in 5 of 11 observed group bookings.',
     'The captain blames the app for losing the slot and falls back to calling the venue.',
     'Let the captain confirm once a threshold is paid and carry the rest as owed.',tech,'2026-09-02',5,NULL),

    (pid||'-p03', target_room, pid, 'Player / Captain',
     'Captains end up personally funding no-shows',
     'To save the booking the captain pays the missing shares, then chases teammates for days.',
     'Captain interviews','friction','open',ARRAY['Split-Logic','Retention'],biz,
     'Every captain interviewed described doing this at least once.',
     'Captains are the ones who bring teams onto the platform; if it costs them money they stop.',
     'Add a visible owed-to-captain ledger with one-tap nudges.',tech,'2026-09-09',7,NULL),

    (pid||'-p04', target_room, pid, 'Turf Owner',
     'Double booking when a phone booking lands during a hold',
     'The owner takes a call and writes a slot into their register while the app holds the same slot for a captain.',
     'Pilot weekend','blocker','investigating',ARRAY['Double-Booking','Sync','Owner-Tablet'],ops,
     'Twice in one weekend at the pilot venue.',
     'Two teams turn up for one pitch, and the owner blames the app in front of customers.',
     'Show live holds on the owner tablet and let the owner block a slot instantly.',tech,'2026-08-30',2,NULL),

    (pid||'-p05', target_room, pid, 'Player / Captain',
     'Bank UPI confirmation lags well past payment',
     'The player sees money debited but the app still shows pending, so they pay a second time.',
     'Payment logs','blocker','investigating',ARRAY['UPI','Webhook','Reconciliation'],tech,
     'p95 confirmation latency measured at 38 seconds; worst case over four minutes.',
     'Duplicate payments mean manual refunds and destroy trust in the split flow.',
     'Poll payment status every five seconds while a booking is pending.',tech,'2026-08-27',9,NULL),

    (pid||'-p06', target_room, pid, 'Turf Owner',
     'No-shows still cost the owner the full slot',
     'Even with advance collection, a team that cancels an hour out leaves the pitch empty.',
     'Owner interviews','friction','open',ARRAY['No-Shows','Cancellation','Revenue'],biz,
     'Owners estimate 20-30% weekend no-show rate before the platform.',
     'The core promise of the product is protecting this revenue.',
     'Release late cancellations back to the grid at a discount.',biz,'2026-09-15',3,NULL),

    (pid||'-p07', target_room, pid, 'Player / Captain',
     'Captains cannot tell who has actually paid',
     'The captain gets eight separate confirmations with no single view of who is outstanding.',
     'Weekend playtest','friction','open',ARRAY['UX','Split-Logic','Transparency'],tech,
     'Every captain in the playtest opened the payment screen more than five times.',
     'Chasing shifts back to WhatsApp, which is the behaviour we are replacing.',
     'Build a per-player paid/pending roster on the booking screen.',tech,'2026-09-05',6,NULL),

    (pid||'-p08', target_room, pid, 'Turf Owner',
     'Owners will not maintain pricing in a second place',
     'Pricing varies by day, hour and pitch, and owners refuse to keep the app in sync by hand.',
     'Venue onboarding','friction','open',ARRAY['Onboarding','Pricing','Owner-Effort'],ops,
     'Two owners abandoned setup at the pricing step.',
     'Stale pricing means the app quotes the wrong amount and the owner stops trusting it.',
     'Ship a pricing grid with bulk edit and copy-across-days.',ops,'2026-09-10',2,NULL),

    (pid||'-p09', target_room, pid, 'Player / Captain',
     'First-time players drop at account creation',
     'A player invited to pay their share is asked to sign up before paying.',
     'Funnel analytics','blocker','open',ARRAY['Onboarding','Funnel','Friction'],tech,
     'Roughly 40% of invited players never reach the payment screen.',
     'Split payment only works if paying is frictionless for people who did not choose the app.',
     'Allow paying a share with a phone number only, no account.',tech,'2026-09-01',NULL,NULL),

    (pid||'-p10', target_room, pid, 'Turf Owner',
     'Weak mobile signal at the pitch breaks the tablet dashboard',
     'Several venues have poor connectivity at the counter, so the dashboard stalls at peak hours.',
     'Pilot venue visit','friction','open',ARRAY['Offline','Reliability','Owner-Tablet'],ops,
     'Two of three pilot venues had unusable signal on the pitch side.',
     'If the owner cannot confirm arrivals they revert to the paper register.',
     'Cache today''s bookings locally and sync when the connection returns.',tech,'2026-09-14',NULL,NULL),

    (pid||'-p11', target_room, pid, 'Player / Captain',
     'Teams want the same slot every week without rebooking',
     'Regular teams play the same hour weekly and find re-entering it every week tedious.',
     'Captain interviews','idea','open',ARRAY['Retention','Recurring','Feature-Request'],biz,
     'Raised by four of six regular captains.',
     'Recurring bookings would lock in predictable weekly revenue per venue.',
     'Prototype a recurring booking with a skip-this-week control.',tech,'2026-09-20',4,NULL),

    (pid||'-p12', target_room, pid, 'Turf Owner',
     'Owners ask for a printable end-of-day settlement summary',
     'Owners reconcile the day''s takings on paper and want one sheet showing bookings against money received.',
     'Owner interviews','idea','open',ARRAY['Reporting','Owner-Trust','Settlement'],ops,
     'Requested by all three pilot owners.',
     'A daily summary is what convinces an owner the platform is not losing their money.',
     'Generate a one-page daily settlement PDF.',ops,'2026-09-22',3,NULL)
  ON CONFLICT (id) DO NOTHING;

  -- ────────────────────────────────────────
  -- Diagrams
  INSERT INTO public.team_diagrams (id, room_id, project_id, title, description, diagram_type, nodes, edges, sort_order)
  VALUES
    (pid||'-d01', target_room, pid,
     'Booking and split-payment journey',
     'Captain picks a slot, the hold starts, every player pays their share, and the booking confirms.',
     'user_journey',
     '[{"id":"n1","label":"Team Captain","sublabel":"Opens the venue booking link","type":"actor","x":40,"y":140,"color":"emerald","icon":"User"},
       {"id":"n2","label":"Live Slot Grid","sublabel":"14 days of availability per pitch","type":"process","x":260,"y":140,"color":"blue","icon":"Calendar"},
       {"id":"n3","label":"10-Minute Hold","sublabel":"Slot locked, countdown visible","type":"system","x":480,"y":140,"color":"amber","icon":"Clock"},
       {"id":"n4","label":"Split Generator","sublabel":"One UPI link per player","type":"system","x":700,"y":140,"color":"purple","icon":"CreditCard"},
       {"id":"n5","label":"Players Pay","sublabel":"Each share paid individually","type":"actor","x":700,"y":300,"color":"emerald","icon":"Users"},
       {"id":"n6","label":"Reconciliation","sublabel":"Webhook, with polling fallback","type":"database","x":480,"y":300,"color":"amber","icon":"CheckCircle"},
       {"id":"n7","label":"Booking Confirmed","sublabel":"WhatsApp to captain and owner","type":"process","x":260,"y":300,"color":"emerald","icon":"MessageCircle"},
       {"id":"n8","label":"Hold Expired","sublabel":"Partial payment rescue path","type":"process","x":480,"y":440,"color":"red","icon":"AlertTriangle"}]'::jsonb,
     '[{"id":"e1","from":"n1","to":"n2","label":"Picks pitch and time"},
       {"id":"e2","from":"n2","to":"n3","label":"Selects slot"},
       {"id":"e3","from":"n3","to":"n4","label":"Enters squad size"},
       {"id":"e4","from":"n4","to":"n5","label":"Sends links"},
       {"id":"e5","from":"n5","to":"n6","label":"UPI payments"},
       {"id":"e6","from":"n6","to":"n7","label":"All shares settled"},
       {"id":"e7","from":"n3","to":"n8","label":"Countdown lapses","dashed":true},
       {"id":"e8","from":"n8","to":"n6","label":"Refund or extend","dashed":true}]'::jsonb,
     0),

    (pid||'-d02', target_room, pid,
     'System architecture',
     'Client apps, booking service, payment integration and the owner tablet, with the shared datastore between them.',
     'system_arch',
     '[{"id":"a1","label":"Player Web App","sublabel":"Slot grid and payment","type":"actor","x":40,"y":80,"color":"emerald","icon":"Smartphone"},
       {"id":"a2","label":"Owner Tablet","sublabel":"Front-desk dashboard","type":"actor","x":40,"y":280,"color":"blue","icon":"Monitor"},
       {"id":"a3","label":"Booking Service","sublabel":"Holds, availability, conflicts","type":"system","x":300,"y":180,"color":"purple","icon":"Server"},
       {"id":"a4","label":"Payment Service","sublabel":"Split links and reconciliation","type":"system","x":540,"y":80,"color":"amber","icon":"CreditCard"},
       {"id":"a5","label":"UPI / PSP","sublabel":"Third-party rails","type":"system","x":780,"y":80,"color":"gray","icon":"Landmark"},
       {"id":"a6","label":"Postgres","sublabel":"Venues, slots, bookings, payments","type":"database","x":540,"y":280,"color":"blue","icon":"Database"},
       {"id":"a7","label":"Realtime","sublabel":"Live slot and hold updates","type":"system","x":300,"y":380,"color":"emerald","icon":"Radio"},
       {"id":"a8","label":"Notifier","sublabel":"WhatsApp confirmations","type":"process","x":780,"y":280,"color":"emerald","icon":"MessageCircle"}]'::jsonb,
     '[{"id":"ea1","from":"a1","to":"a3","label":"Browse and hold"},
       {"id":"ea2","from":"a2","to":"a3","label":"Block and confirm arrivals"},
       {"id":"ea3","from":"a3","to":"a6","label":"Reads and writes"},
       {"id":"ea4","from":"a3","to":"a4","label":"Requests split"},
       {"id":"ea5","from":"a4","to":"a5","label":"Creates UPI intents"},
       {"id":"ea6","from":"a5","to":"a4","label":"Webhook callback","dashed":true},
       {"id":"ea7","from":"a4","to":"a6","label":"Records payments"},
       {"id":"ea8","from":"a6","to":"a7","label":"Change stream"},
       {"id":"ea9","from":"a7","to":"a1","label":"Live grid updates","dashed":true},
       {"id":"ea10","from":"a7","to":"a2","label":"Live desk updates","dashed":true},
       {"id":"ea11","from":"a4","to":"a8","label":"Payment settled"}]'::jsonb,
     1),

    (pid||'-d03', target_room, pid,
     'Payment states and refunds',
     'How a booking moves between pending, confirmed, partially paid, cancelled and refunded.',
     'payment_flow',
     '[{"id":"s1","label":"Hold Created","sublabel":"Slot locked for 10 minutes","type":"process","x":40,"y":160,"color":"amber","icon":"Clock"},
       {"id":"s2","label":"Awaiting Shares","sublabel":"Links issued to every player","type":"process","x":260,"y":160,"color":"blue","icon":"Users"},
       {"id":"s3","label":"Fully Paid","sublabel":"Every share settled","type":"process","x":500,"y":80,"color":"emerald","icon":"CheckCircle"},
       {"id":"s4","label":"Partially Paid","sublabel":"Hold lapsed with shares missing","type":"process","x":500,"y":260,"color":"amber","icon":"AlertTriangle"},
       {"id":"s5","label":"Confirmed","sublabel":"Pitch reserved","type":"system","x":740,"y":80,"color":"emerald","icon":"Calendar"},
       {"id":"s6","label":"Captain Covers","sublabel":"Shortfall carried as owed","type":"action","x":740,"y":200,"color":"purple","icon":"Wallet"},
       {"id":"s7","label":"Auto Refund","sublabel":"Each payer refunded their share","type":"action","x":740,"y":340,"color":"red","icon":"RotateCcw"},
       {"id":"s8","label":"Late Cancellation","sublabel":"Inside the refund window","type":"action","x":500,"y":440,"color":"red","icon":"XCircle"},
       {"id":"s9","label":"Released to Grid","sublabel":"Offered again at a discount","type":"process","x":260,"y":440,"color":"blue","icon":"Tag"}]'::jsonb,
     '[{"id":"es1","from":"s1","to":"s2","label":"Squad size set"},
       {"id":"es2","from":"s2","to":"s3","label":"All shares in"},
       {"id":"es3","from":"s2","to":"s4","label":"Countdown lapses","dashed":true},
       {"id":"es4","from":"s3","to":"s5","label":"Booking locked"},
       {"id":"es5","from":"s4","to":"s6","label":"Captain pays the gap"},
       {"id":"es6","from":"s6","to":"s5","label":"Booking locked"},
       {"id":"es7","from":"s4","to":"s7","label":"Captain declines","dashed":true},
       {"id":"es8","from":"s5","to":"s8","label":"Team cancels","dashed":true},
       {"id":"es9","from":"s8","to":"s7","label":"Policy refund"},
       {"id":"es10","from":"s8","to":"s9","label":"Resell the slot"}]'::jsonb,
     2),

    (pid||'-d04', target_room, pid,
     'Venue onboarding journey',
     'From first conversation to a venue taking live paid bookings on its own.',
     'user_journey',
     '[{"id":"v1","label":"Owner Contacted","sublabel":"Field visit or referral","type":"actor","x":40,"y":160,"color":"blue","icon":"Phone"},
       {"id":"v2","label":"Walkthrough","sublabel":"Show the grid and split flow","type":"action","x":250,"y":160,"color":"purple","icon":"Presentation"},
       {"id":"v3","label":"Venue Setup","sublabel":"Pitches, hours, pricing grid","type":"process","x":460,"y":160,"color":"amber","icon":"Settings"},
       {"id":"v4","label":"UPI Verification","sublabel":"Owner VPA confirmed as payee","type":"system","x":670,"y":160,"color":"emerald","icon":"ShieldCheck"},
       {"id":"v5","label":"QR Stand Placed","sublabel":"Counter signage live","type":"action","x":670,"y":320,"color":"blue","icon":"QrCode"},
       {"id":"v6","label":"Pilot Weekend","sublabel":"First real bookings and money","type":"process","x":460,"y":320,"color":"amber","icon":"Activity"},
       {"id":"v7","label":"Settlement Review","sublabel":"Owner reconciles day one","type":"action","x":250,"y":320,"color":"purple","icon":"FileText"},
       {"id":"v8","label":"Paid Subscription","sublabel":"Venue converts","type":"system","x":40,"y":320,"color":"emerald","icon":"CheckCircle"}]'::jsonb,
     '[{"id":"ev1","from":"v1","to":"v2","label":"Agrees to a demo"},
       {"id":"ev2","from":"v2","to":"v3","label":"Lists the venue"},
       {"id":"ev3","from":"v3","to":"v4","label":"Adds payout details"},
       {"id":"ev4","from":"v4","to":"v5","label":"Ready to take bookings"},
       {"id":"ev5","from":"v5","to":"v6","label":"Players start scanning"},
       {"id":"ev6","from":"v6","to":"v7","label":"Weekend closes"},
       {"id":"ev7","from":"v7","to":"v8","label":"Money reconciles"},
       {"id":"ev8","from":"v7","to":"v3","label":"Pricing corrections","dashed":true}]'::jsonb,
     3)
  ON CONFLICT (id) DO NOTHING;

  -- ────────────────────────────────────────
  -- Notes
  INSERT INTO public.team_notes (id, room_id, project_id, title, content, category, pinned, author)
  VALUES
    (pid||'-n01', target_room, pid, 'Owner pitch: the three-minute version',
     E'Lead with money lost, never with software.\n\n1. "How many weekend slots go empty because a team does not turn up?" — let them say the number.\n2. "What if every player paid before they arrived?" — that is the whole product.\n3. Show the live grid on the phone, then the counter tablet.\n4. Settle the fear early: money goes to your UPI, we never hold it.\n5. Ask for one weekend, not a contract.\n\nDo not mention subscriptions until after the pilot weekend closes.',
     'Playbook', true, biz),

    (pid||'-n02', target_room, pid, 'Split-payment rules we settled on',
     E'- Hold is 10 minutes, extendable once by 5 minutes by the captain.\n- Shares are equal by default; the captain can override individual amounts.\n- Booking confirms when 100% is collected, or when the captain covers the gap.\n- A player who pays for a booking that later fails is refunded automatically, no support ticket.\n- Refund window is per-venue; default is full refund up to 6 hours before kickoff.',
     'Strategy', true, tech),

    (pid||'-n03', target_room, pid, 'Pilot weekend field notes',
     E'Observed 11 group bookings across two venues.\n\nWhat worked: captains understood the grid with no explanation; owners liked the arrivals list.\n\nWhat broke: five bookings hit the hold timeout waiting on the last players; two double-bookings from phone calls landing mid-hold; several duplicate payments when confirmation lagged.\n\nBiggest surprise: players who were not app users happily paid via the link, but refused to create an account first.',
     'Field Intel', false, ops),

    (pid||'-n04', target_room, pid, 'Why captains are the real customer',
     E'The owner signs the contract, but the captain brings the volume.\n\nA captain books weekly, drags 7-15 players in behind them, and absorbs the social cost when something breaks. Every friction point we leave in the split flow gets paid for by the captain, in money or in chasing.\n\nDesign rule: if a change makes the captain''s life harder to make the owner''s easier, it is the wrong trade.',
     'Strategy', false, biz),

    (pid||'-n05', target_room, pid, 'Objections and the answers that work',
     E'"Payments will be delayed." — Money goes straight to your UPI; we are not in the middle. Show the receipt.\n\n"My customers only use WhatsApp." — They still do; we send the confirmation into WhatsApp.\n\n"I already have a register." — Keep it for a month. We will match it, then you decide.\n\n"What does it cost?" — Nothing this weekend. If it does not make you money, there is nothing to talk about.',
     'Playbook', false, biz)
  ON CONFLICT (id) DO NOTHING;

  -- ────────────────────────────────────────
  -- Leads
  INSERT INTO public.team_leads (
    id, room_id, project_id, business_name, category, owner_name, phone, location,
    status, notes, next_follow_up, pilot_start_date, pilot_end_date, monthly_value, created_by
  ) VALUES
    (pid||'-l01', target_room, pid, 'Champions Arena (7-a-side & cricket nets)','Turf','Rajesh Kumar','9876543210','Indiranagar 100ft Road',
     'active_pilot','Two football pitches and a cricket net. Heavy Friday and Saturday demand, and the worst no-show problem we have seen. Owner is technical enough to run the tablet himself.',
     '2026-08-25','2026-08-15','2026-09-15',4500,biz),
    (pid||'-l02', target_room, pid, 'Kickoff Sports Park','Turf','Sundar Rajan','9876543211','Whitefield Main Road',
     'paid_client','Converted after one pilot weekend. Three pitches, floodlights, strong weekday corporate bookings. Asked for the daily settlement sheet on day one.',
     '2026-08-28','2026-08-08','2026-08-22',6000,biz),
    (pid||'-l03', target_room, pid, 'Galaxy Turf & Box Cricket','Turf','Imran Sheikh','9876543212','HSR Layout Sector 2',
     'meeting_set','Single box-cricket pitch, very high utilisation. Sceptical about anything touching payments; wants to see another venue''s settlement report first.',
     '2026-08-24',NULL,NULL,3500,biz),
    (pid||'-l04', target_room, pid, 'Green Field Arena','Turf','Prakash M','9876543213','Kumbakonam Town',
     'contacted','Two pitches, mostly weekend league play. Bookings run entirely through a WhatsApp group of about 200 people. Poor mobile signal at the counter.',
     '2026-08-26',NULL,NULL,3000,ops),
    (pid||'-l05', target_room, pid, 'Riverside Sports Club','Turf','Anitha Raman','9876543214','Thanjavur Road',
     'new','Inbound enquiry after seeing a QR stand at Kickoff. Runs coaching sessions alongside open bookings, so scheduling is more complex than a plain slot grid.',
     '2026-08-27',NULL,NULL,4000,biz),
    (pid||'-l06', target_room, pid, 'Victory Turf','Turf','Mohan Das','9876543215','Trichy Highway',
     'lost','Signed with a competitor offering zero commission. Worth revisiting once recurring bookings and the scorebook ship.',
     NULL,NULL,NULL,NULL,biz)
  ON CONFLICT (id) DO NOTHING;

  -- ────────────────────────────────────────
  -- Work links
  INSERT INTO public.team_work_links (id, room_id, project_id, title, url, category, description, added_by)
  VALUES
    (pid||'-w01', target_room, pid, 'Booking flow prototype','https://example.com/turf/prototype','design','Clickable captain journey from slot grid through split payment.',tech),
    (pid||'-w02', target_room, pid, 'Owner tablet dashboard mockup','https://example.com/turf/owner-tablet','design','Front-desk layout, tuned for reading at arm''s length.',tech),
    (pid||'-w03', target_room, pid, 'Turf booking repository','https://example.com/turf/repo','repo','Application source and deployment configuration.',tech),
    (pid||'-w04', target_room, pid, 'Pilot venue agreement template','https://example.com/turf/pilot-agreement','doc','One-page pilot terms, no lock-in.',biz),
    (pid||'-w05', target_room, pid, 'Booking funnel dashboard','https://example.com/turf/funnel','doc','Drop-off from slot view through to fully paid.',tech),
    (pid||'-w06', target_room, pid, 'Field research recordings','https://example.com/turf/research','drive','Owner and captain interview recordings and transcripts.',ops)
  ON CONFLICT (id) DO NOTHING;

  -- ────────────────────────────────────────
  -- Workflow SOPs
  INSERT INTO public.team_workflows (id, room_id, project_id, title, description, target_outcome, steps, status, sort_order)
  VALUES
    (pid||'-s01', target_room, pid,
     'Onboard a new venue',
     'Everything between an owner agreeing to try it and their first live paid booking.',
     'Venue live on the grid, payouts verified, and a QR stand on the counter.',
     '[{"id":"st1","stepNumber":1,"title":"Confirm pitch inventory","description":"Count pitches, surfaces and floodlights; note which can run in parallel.","completed":true,"requiredProof":"Photo of each pitch"},
       {"id":"st2","stepNumber":2,"title":"Capture opening hours","description":"Record weekday and weekend hours, including any maintenance blocks.","completed":true},
       {"id":"st3","stepNumber":3,"title":"Build the pricing grid","description":"Enter per-hour pricing by day and pitch; confirm peak and off-peak rates with the owner.","completed":true,"requiredProof":"Owner signs off on the grid"},
       {"id":"st4","stepNumber":4,"title":"Verify the payout VPA","description":"Send a one rupee test payment and have the owner confirm the credit in their own bank app.","completed":false,"requiredProof":"Screenshot of the credit"},
       {"id":"st5","stepNumber":5,"title":"Place the QR stand","description":"Install signage at the counter pointing at the venue page.","completed":false,"requiredProof":"Photo of the counter"},
       {"id":"st6","stepNumber":6,"title":"Train the desk staff","description":"Walk whoever works the counter through arrivals, blocking a slot, and cancellations.","completed":false}]'::jsonb,
     'in_progress', 0),

    (pid||'-s02', target_room, pid,
     'Run a pilot weekend',
     'The two days that decide whether a venue converts.',
     'A full weekend of real bookings, money settled, and a reconciliation the owner trusts.',
     '[{"id":"sp1","stepNumber":1,"title":"Load existing bookings","description":"Import whatever is already in the register or WhatsApp so the calendar is complete.","completed":true},
       {"id":"sp2","stepNumber":2,"title":"Brief the owner on the tablet","description":"Arrivals, live holds, and how to block a slot for a phone booking.","completed":true},
       {"id":"sp3","stepNumber":3,"title":"Be on site Friday evening","description":"Peak load, and the moment most problems surface.","completed":false},
       {"id":"sp4","stepNumber":4,"title":"Log every failure","description":"Anything that made the owner or a captain hesitate goes into the problem bank the same day.","completed":false},
       {"id":"sp5","stepNumber":5,"title":"Reconcile Sunday night","description":"Match bookings against money received and walk the owner through it line by line.","completed":false,"requiredProof":"Signed settlement sheet"}]'::jsonb,
     'in_progress', 1),

    (pid||'-s03', target_room, pid,
     'Handle a payment dispute',
     'What to do when a player says they paid and the booking says otherwise.',
     'Player made whole within one hour, and the root cause logged.',
     '[{"id":"sd1","stepNumber":1,"title":"Get the UPI reference","description":"Ask the player for the transaction reference from their bank app.","completed":false},
       {"id":"sd2","stepNumber":2,"title":"Check reconciliation logs","description":"Look for a late or dropped webhook against that reference.","completed":false},
       {"id":"sd3","stepNumber":3,"title":"Settle the booking manually","description":"Mark the share paid so the team is not blocked at the gate.","completed":false},
       {"id":"sd4","stepNumber":4,"title":"Refund any duplicate","description":"If they paid twice, refund the second payment the same day.","completed":false,"requiredProof":"Refund reference"},
       {"id":"sd5","stepNumber":5,"title":"File the root cause","description":"Add or increment the matching entry in the problem bank.","completed":false}]'::jsonb,
     'draft', 2)
  ON CONFLICT (id) DO NOTHING;

  RETURN pid;
END;
$fn$;

REVOKE ALL ON FUNCTION public.seed_turf_workspace(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.seed_turf_workspace(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
