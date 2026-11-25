-- Claim old redemption rows for the member account that has the same room and name,
-- so per-account redemption limits also see rewards requested before account_id existed.
UPDATE `reward_redemptions` r
JOIN `company_members` m ON m.`room_code` = r.`room_code` AND m.`name` = r.`member_name`
SET r.`account_id` = m.`account_id`
WHERE r.`account_id` IS NULL AND m.`account_id` IS NOT NULL;
