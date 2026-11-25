-- Claim old redemption rows for the member account with the same room and name, so per-account
-- limits also see rewards requested before account_id existed. Only unambiguous matches: if two
-- account-linked members in a room share the name, the row stays unclaimed rather than guessed.
UPDATE `reward_redemptions` r
JOIN `company_members` m ON m.`room_code` = r.`room_code` AND m.`name` = r.`member_name`
SET r.`account_id` = m.`account_id`
WHERE r.`account_id` IS NULL
  AND m.`account_id` IS NOT NULL
  AND (SELECT COUNT(*) FROM (SELECT `room_code`, `name` FROM `company_members` WHERE `account_id` IS NOT NULL) m2
       WHERE m2.`room_code` = r.`room_code` AND m2.`name` = r.`member_name`) = 1;
