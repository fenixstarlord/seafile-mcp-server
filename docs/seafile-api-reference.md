# Seafile API Reference

> **Source:** [https://seafile-api.readme.io/reference/introduction](https://seafile-api.readme.io/reference/introduction)  
> **API Version:** v13.0

---

## Table of Contents

- [Introduction](#introduction)
- [Terminology](#terminology)
- [Authentication](#authentication)
- [Status Codes](#status-codes)
- [Authentication Endpoints](#authentication-endpoints)
- [Via Repo-Token](#via-repo-token)
  - [API Tokens](#api-tokens-via-repo-token)
  - [Dir / Files](#dir--files-via-repo-token)
  - [Share Links](#share-links-via-repo-token)
  - [Metadata Records](#metadata-records-via-repo-token)
  - [Metadata Views](#metadata-views-via-repo-token)
  - [Tags](#tags-via-repo-token)
- [Account Operations - User](#account-operations---user)
  - [Account](#account)
  - [Activities](#activities)
  - [Avatars](#avatars)
  - [Department Libraries](#department-libraries-user)
  - [Devices](#devices)
  - [Directories](#directories)
  - [File Comments](#file-comments)
  - [File History](#file-history)
  - [Files](#files)
  - [File Search](#file-search)
  - [File Tags](#file-tags)
  - [File Upload](#file-upload)
  - [Files/Directories Batch Operation](#filesdirectories-batch-operation)
  - [Groups](#groups-user)
  - [Invitations](#invitations)
  - [Libraries](#libraries-user)
  - [List Share](#list-share)
  - [Share to User/Group](#share-to-usergroup)
  - [Server Info](#server-info)
  - [Share Links](#share-links-user)
  - [Snapshot](#snapshot)
  - [Snapshot Label](#snapshot-label)
  - [Starred Items](#starred-items)
  - [Sub Folder Permissions](#sub-folder-permissions)
  - [Upload Links](#upload-links)
  - [User Profile](#user-profile)
  - [User Search](#user-search)
  - [Wiki](#wiki)
- [Account Operations - System Admin](#account-operations---system-admin)
  - [Accounts](#accounts-admin)
  - [Departments](#departments-admin)
  - [Department Libraries](#department-libraries-admin)
  - [Groups](#groups-admin)
  - [Libraries](#libraries-admin)
  - [Logs](#logs-admin)
  - [Notifications](#notifications-admin)
  - [Organizations](#organizations-admin)
  - [Share](#share-admin)
  - [Share Links](#share-links-admin)
- [Metadata Operations - User](#metadata-operations---user)
  - [Metadata Config](#metadata-config)
  - [Metadata Records](#metadata-records)
  - [Metadata Views](#metadata-views)
  - [Tags](#tags-metadata)
  - [OCR](#ocr)
  - [Face Recognition](#face-recognition)

---

## Introduction

The Seafile API is organized around REST. It has predictable resource-oriented URLs, accepts form-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes, authentication, and verbs.

Seafile is a self-hosted cloud storage system. You need to test the APIs with your own account in your own Seafile instance.

**Base URL:** `https://{server}`

---

## Terminology

| Term              | Description                                                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **user_id**       | The unique user id in the form `user@example.com`, stored in `EmailUser.email` in `ccnet_db`. In old versions, this is the same as a user's real email. In new versions, the user's real email is stored in `contact_email` field instead. It is unchangeable. |
| **email**         | Same as `user_id`. The term is still used in API returned values. Should be avoided in other places.                                                                                                                                                           |
| **username**      | Same as `user_id`, used internally in Seafile's code.                                                                                                                                                                                                          |
| **contact_email** | User's contact email, which is also a user's real email. It is changeable.                                                                                                                                                                                     |

---

## Authentication

All API calls must be authenticated with a valid Seafile API token. All requests require an authorization header:

```
Authorization: Bearer {{Account-Token or Repo-Token}}
```

> **Note:** For versions less than 11.0, use `Token` instead of `Bearer`:
>
> ```
> Authorization: Token {{Account-Token or Repo-Token}}
> ```

### The Two Tokens

#### Account-Token

An **Account-Token** is generated with your account name and password. Most APIs can be called with an account token.

#### Repo-Token

A **Repo-Token** is like a password to use the APIs of a single library. You can create as many Repo-Tokens per library as you want. Every Repo-Token can have read or write permissions. This token is valid until you delete them. If a user only needs to manipulate the contents of a specific library, it is more secure to use the repo API token.

You can generate **Repo-Token** for a library via the Web UI, in "Library context menu -> Advanced -> API Token".

---

## Status Codes

Seafile uses conventional HTTP response codes to indicate the success or failure of an API request.

### Success Codes

| Code         | Description                                |
| ------------ | ------------------------------------------ |
| **200 - OK** | Seafile successfully processed the request |

### Error Codes

| Code                                   | Description                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **400 - Bad Request**                  | The request was unacceptable, often due to missing a required parameter.                         |
| **401 - Unauthorized**                 | No valid token provided or wrong format of the authorization header.                             |
| **402 - Request Failed**               | The parameters were valid but the request failed.                                                |
| **403 - Forbidden**                    | The provided token key doesn't have permissions to perform the request.                          |
| **404 - Not Found**                    | The requested resource doesn't exist.                                                            |
| **429 - Too Many Requests**            | Too many requests hit the API too quickly. We recommend an exponential backoff of your requests. |
| **500, 502, 503, 504 - Server Errors** | Something went wrong on Seafile's end.                                                           |

---

## Authentication Endpoints

### Obtain Account Token

```
POST /api2/auth-token/
```

Generate an Account-Token with your username and password. This Account-Token is necessary for all the following account operations.

**Body Parameters:**

| Parameter  | Type   | Required | Description   |
| ---------- | ------ | -------- | ------------- |
| `username` | string | Yes      | Email address |
| `password` | string | Yes      | Password      |

**Headers:**

| Header          | Description                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `X-SEAFILE-OTP` | Two-factor token (usually generated with a mobile app like Google Authenticator). Optional, only needed if 2FA is activated for your account. |

**Response:** `200 OK`

---

### Generate Repo API Token

```
POST /api/v2.1/repos/{repo_id}/repo-api-tokens/
```

Generate a repo API token using the user's Account-Token.

**Path Parameters:**

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `repo_id` | string | Yes      | The unique identifier of a library |

**Body Parameters:**

| Parameter    | Type   | Required | Description                                            |
| ------------ | ------ | -------- | ------------------------------------------------------ |
| `permission` | string | Yes      | Permission level: `rw` (read-write) or `r` (read-only) |
| `app_name`   | string | Yes      | App name                                               |

**Response:** `200 OK`

---

## Via Repo-Token

The following endpoints can be accessed using a Repo-Token instead of an Account-Token.

### API Tokens (Via Repo-Token)

| Method   | Endpoint                                                | Description           |
| -------- | ------------------------------------------------------- | --------------------- |
| `GET`    | `/api/v2.1/repos/{repo_id}/repo-api-tokens/`            | List repo API tokens  |
| `PUT`    | `/api/v2.1/repos/{repo_id}/repo-api-tokens/{app_name}/` | Update repo API token |
| `DELETE` | `/api/v2.1/repos/{repo_id}/repo-api-tokens/{app_name}/` | Delete repo API token |

### Dir / Files (Via Repo-Token)

| Method   | Endpoint                                         | Description                      |
| -------- | ------------------------------------------------ | -------------------------------- |
| `GET`    | `/api/v2.1/via-repo-token/dir/`                  | List items in directory          |
| `POST`   | `/api/v2.1/via-repo-token/dir/`                  | Operation directory              |
| `DELETE` | `/api/v2.1/via-repo-token/dir/`                  | Delete dir                       |
| `GET`    | `/api/v2.1/via-repo-token/file/`                 | Get file info                    |
| `POST`   | `/api/v2.1/via-repo-token/file/`                 | Operation file                   |
| `PUT`    | `/api/v2.1/via-repo-token/file/`                 | Lock/Unlock file                 |
| `DELETE` | `/api/v2.1/via-repo-token/file/`                 | Delete file                      |
| `POST`   | `/api/v2.1/via-repo-token/move-dir/`             | Move directory with items merged |
| `GET`    | `/api/v2.1/via-repo-token/upload-link/`          | Get upload link                  |
| `GET`    | `/api/v2.1/via-repo-token/download-link/`        | Get download link                |
| `GET`    | `/api/v2.1/via-repo-token/repo-info/`            | Get repo info                    |
| `POST`   | `/api/v2.1/via-repo-token/sync-batch-move-item/` | Sync batch move item             |
| `POST`   | `/api/v2.1/via-repo-token/sync-batch-copy-item/` | Sync batch copy item             |
| `DELETE` | `/api/v2.1/via-repo-token/batch-delete-item/`    | Batch delete items               |

### Share Links (Via Repo-Token)

| Method | Endpoint                                | Description       |
| ------ | --------------------------------------- | ----------------- |
| `POST` | `/api/v2.1/via-repo-token/share-links/` | Create share link |

### Metadata Records (Via Repo-Token)

| Method | Endpoint                                     | Description             |
| ------ | -------------------------------------------- | ----------------------- |
| `GET`  | `/api/v2.1/via-repo-token/metadata-records/` | List metadata records   |
| `PUT`  | `/api/v2.1/via-repo-token/metadata-records/` | Update metadata records |

### Metadata Views (Via Repo-Token)

| Method   | Endpoint                                             | Description    |
| -------- | ---------------------------------------------------- | -------------- |
| `GET`    | `/api/v2.1/via-repo-token/metadata-views/`           | List views     |
| `POST`   | `/api/v2.1/via-repo-token/metadata-views/`           | Add view       |
| `PUT`    | `/api/v2.1/via-repo-token/metadata-views/`           | Update view    |
| `DELETE` | `/api/v2.1/via-repo-token/metadata-views/`           | Delete view    |
| `GET`    | `/api/v2.1/via-repo-token/metadata-views/{view_id}/` | Get a view     |
| `POST`   | `/api/v2.1/via-repo-token/metadata/move-views/`      | Move view      |
| `POST`   | `/api/v2.1/via-repo-token/metadata/duplicate-view/`  | Duplicate view |

### Tags (Via Repo-Token)

| Method   | Endpoint                                                | Description           |
| -------- | ------------------------------------------------------- | --------------------- |
| `PUT`    | `/api/v2.1/via-repo-token/metadata/tags-links/`         | Update tags links     |
| `DELETE` | `/api/v2.1/via-repo-token/metadata/tags-links/`         | Delete tags links     |
| `PUT`    | `/api/v2.1/via-repo-token/metadata/tags-status/`        | Turn on tags feature  |
| `DELETE` | `/api/v2.1/via-repo-token/metadata/tags-status/`        | Turn off tags feature |
| `GET`    | `/api/v2.1/via-repo-token/metadata/tags/`               | List tags             |
| `POST`   | `/api/v2.1/via-repo-token/metadata/tags/`               | Add tags              |
| `PUT`    | `/api/v2.1/via-repo-token/metadata/tags/`               | Update tags           |
| `DELETE` | `/api/v2.1/via-repo-token/metadata/tags/`               | Delete tags           |
| `PUT`    | `/api/v2.1/via-repo-token/metadata/file-tags/`          | Update file tags      |
| `GET`    | `/api/v2.1/via-repo-token/metadata/tag-files/{tag_id}/` | List tag files        |
| `POST`   | `/api/v2.1/via-repo-token/metadata/tags-files/`         | List tags files       |
| `POST`   | `/api/v2.1/via-repo-token/metadata/tags-links/`         | Add tags links        |
| `POST`   | `/api/v2.1/via-repo-token/metadata/merge-tags/`         | Merge tags            |

---

## Account Operations - User

### Account

| Method | Endpoint              | Description      |
| ------ | --------------------- | ---------------- |
| `GET`  | `/api2/account/info/` | Get account info |
| `POST` | `/api2/client-login/` | Get client token |

### Activities

| Method | Endpoint                | Description         |
| ------ | ----------------------- | ------------------- |
| `GET`  | `/api/v2.1/activities/` | Get file activities |

### Avatars

| Method | Endpoint                                    | Description               |
| ------ | ------------------------------------------- | ------------------------- |
| `POST` | `/api/v2.1/user-avatar/`                    | Upload/Update user avatar |
| `GET`  | `/api2/avatars/user/{user}/resized/{size}/` | Get user avatar           |

### Department Libraries (User)

| Method   | Endpoint                                                       | Description                                       |
| -------- | -------------------------------------------------------------- | ------------------------------------------------- |
| `POST`   | `/api/v2.1/groups/{group_id}/group-owned-libraries/`           | Add group owned library                           |
| `PUT`    | `/api/v2.1/groups/{group_id}/group-owned-libraries/{repo_id}/` | Rename a group owned library                      |
| `DELETE` | `/api/v2.1/groups/{group_id}/libraries/{repo_id}/`             | Delete group owned library                        |
| `GET`    | `/api/v2.1/group-owned-libraries/{repo_id}/user-share/`        | Get group owned library user share info           |
| `POST`   | `/api/v2.1/group-owned-libraries/{repo_id}/user-share/`        | Share group owned library to user                 |
| `PUT`    | `/api/v2.1/group-owned-libraries/{repo_id}/user-share/`        | Modify group owned library user share permission  |
| `DELETE` | `/api/v2.1/group-owned-libraries/{repo_id}/user-share/`        | Delete group owned library user share             |
| `GET`    | `/api/v2.1/group-owned-libraries/{repo_id}/group-share/`       | Get group owned library group share info          |
| `POST`   | `/api/v2.1/group-owned-libraries/{repo_id}/group-share/`       | Share group owned library to group                |
| `PUT`    | `/api/v2.1/group-owned-libraries/{repo_id}/group-share/`       | Modify group owned library group share permission |
| `DELETE` | `/api/v2.1/group-owned-libraries/{repo_id}/group-share/`       | Delete group owned library group share            |

### Devices

| Method   | Endpoint         | Description   |
| -------- | ---------------- | ------------- |
| `GET`    | `/api2/devices/` | List devices  |
| `DELETE` | `/api2/devices/` | Unlink device |

### Directories

| Method   | Endpoint                                | Description                          |
| -------- | --------------------------------------- | ------------------------------------ |
| `GET`    | `/api2/repos/{repo_id}/dir/`            | List items in directory              |
| `POST`   | `/api2/repos/{repo_id}/dir/`            | Create new or rename directory       |
| `DELETE` | `/api2/repos/{repo_id}/dir/`            | Delete directory                     |
| `GET`    | `/api/v2.1/repos/{repo_id}/dir/detail/` | Get directory detail                 |
| `PUT`    | `/api2/repos/{repo_id}/dir/revert/`     | Revert directory to a history status |
| `GET`    | `/api/v2.1/repos/{repo_id}/zip-task/`   | Get task directory token             |
| `GET`    | `/api/v2.1/query-zip-progress/`         | Query task progress                  |
| `POST`   | `/api/v2.1/move-folder-merge/`          | Move directory with items merged     |

### File Comments

| Method   | Endpoint                                      | Description            |
| -------- | --------------------------------------------- | ---------------------- |
| `GET`    | `/api2/repos/{repo_id}/file/comments/`        | List file comments     |
| `POST`   | `/api2/repos/{repo_id}/file/comments/`        | Submit a file comment  |
| `GET`    | `/api2/repos/{repo_id}/file/comments/{pk}/`   | Get a file comment     |
| `PUT`    | `/api2/repos/{repo_id}/file/comments/{pk}/`   | Update a file comment  |
| `DELETE` | `/api2/repos/{repo_id}/file/comments/{pk}/`   | Delete a file comment  |
| `GET`    | `/api2/repos/{repo_id}/file/comments/counts/` | Get number of comments |

### File History

| Method | Endpoint                                  | Description                   |
| ------ | ----------------------------------------- | ----------------------------- |
| `GET`  | `/api/v2.1/repos/{repo_id}/file/history/` | Get file history              |
| `GET`  | `/api2/repos/{repo_id}/file/revision/`    | Download file from a revision |

### Files

| Method   | Endpoint                             | Description                           |
| -------- | ------------------------------------ | ------------------------------------- |
| `POST`   | `/api/v2.1/repos/{repo_id}/file/`    | Create/Rename/Move/Copy/Revert a file |
| `PUT`    | `/api/v2.1/repos/{repo_id}/file/`    | Lock/Unlock file                      |
| `DELETE` | `/api/v2.1/repos/{repo_id}/file/`    | Delete file                           |
| `GET`    | `/api2/repos/{repo_id}/file/`        | Download file                         |
| `GET`    | `/api2/repos/{repo_id}/file/detail/` | Get file detail                       |
| `GET`    | `/api/v2.1/smart-link/`              | Get smart link for a file             |

### File Search

| Method | Endpoint                 | Description                     |
| ------ | ------------------------ | ------------------------------- |
| `GET`  | `/api2/search/`          | Search files in libraries       |
| `GET`  | `/api/v2.1/search/file/` | Search files by name in library |

### File Tags

| Method   | Endpoint                                                | Description                 |
| -------- | ------------------------------------------------------- | --------------------------- |
| `GET`    | `/api/v2.1/repos/{repo_id}/repo-tags/`                  | List all tags of a library  |
| `POST`   | `/api/v2.1/repos/{repo_id}/repo-tags/`                  | Add a tag to a library      |
| `PUT`    | `/api/v2.1/repos/{repo_id}/repo-tags/{repo_tag_id}/`    | Update a tag of a library   |
| `DELETE` | `/api/v2.1/repos/{repo_id}/repo-tags/{repo_tag_id}/`    | Delete a tag of a library   |
| `GET`    | `/api/v2.1/repos/{repo_id}/file-tags/`                  | List all tags of a file     |
| `POST`   | `/api/v2.1/repos/{repo_id}/file-tags/`                  | Add a tag for a file        |
| `DELETE` | `/api/v2.1/repos/{repo_id}/file-tags/{file_tag_id}/`    | Delete a tag from a file    |
| `GET`    | `/api/v2.1/repos/{repo_id}/tagged-files/{repo_tag_id}/` | List tagged files by tag id |

### File Upload

| Method | Endpoint                                         | Description     |
| ------ | ------------------------------------------------ | --------------- |
| `GET`  | `/api2/repos/{repo_id}/upload-link/`             | Get upload link |
| `POST` | `/seafhttp/upload-api/{upload-token}?ret-json=1` | Upload file     |
| `GET`  | `/api2/repos/{repo_id}/update-link/`             | Get update link |
| `POST` | `/seafhttp/update-api/{upload-token}`            | Update file     |

### Files/Directories Batch Operation

| Method   | Endpoint                                 | Description                     |
| -------- | ---------------------------------------- | ------------------------------- |
| `POST`   | `/api/v2.1/repos/sync-batch-copy-item/`  | Batch copy items synchronously  |
| `POST`   | `/api/v2.1/repos/sync-batch-move-item/`  | Batch move items synchronously  |
| `DELETE` | `/api/v2.1/repos/batch-delete-item/`     | Batch delete items              |
| `POST`   | `/api/v2.1/repos/async-batch-copy-item/` | Batch copy items asynchronously |
| `POST`   | `/api/v2.1/repos/async-batch-move-item/` | Batch move items asynchronously |
| `GET`    | `/api/v2.1/query-copy-move-progress/`    | Query async operation progress  |
| `DELETE` | `/api/v2.1/copy-move-task/`              | Cancel async operation          |

### Groups (User)

| Method   | Endpoint                                         | Description                                            |
| -------- | ------------------------------------------------ | ------------------------------------------------------ |
| `GET`    | `/api2/groups/`                                  | List groups                                            |
| `POST`   | `/api/v2.1/groups/`                              | Add a group                                            |
| `GET`    | `/api/v2.1/groups/{group_id}/`                   | Get info of a group                                    |
| `PUT`    | `/api/v2.1/groups/{group_id}/`                   | Rename/Transfer a group                                |
| `DELETE` | `/api/v2.1/groups/{group_id}/`                   | Delete a group                                         |
| `GET`    | `/api/v2.1/groups/{group_id}/members/`           | List all group members                                 |
| `POST`   | `/api/v2.1/groups/{group_id}/members/`           | Add a group member                                     |
| `POST`   | `/api/v2.1/groups/{group_id}/members/bulk/`      | Bulk add group members                                 |
| `GET`    | `/api/v2.1/groups/{group_id}/members/{user_id}/` | Get info of a group member                             |
| `PUT`    | `/api/v2.1/groups/{group_id}/members/{user_id}/` | Set/Unset a group admin                                |
| `DELETE` | `/api/v2.1/groups/{group_id}/members/{user_id}/` | Leave group or group owner/admin delete a group member |

### Invitations

| Method   | Endpoint                                           | Description           |
| -------- | -------------------------------------------------- | --------------------- |
| `GET`    | `/api/v2.1/invitations/`                           | List invitations      |
| `POST`   | `/api/v2.1/invitations/`                           | Add invitation        |
| `POST`   | `/api/v2.1/invitations/batch/`                     | Batch add invitations |
| `GET`    | `/api/v2.1/invitations/{invitation_token}/`        | Get invitation        |
| `DELETE` | `/api/v2.1/invitations/{invitation_token}/`        | Delete invitation     |
| `DELETE` | `/api/v2.1/invitations/{invitation_token}/revoke/` | Revoke invitation     |

### Libraries (User)

| Method   | Endpoint                                         | Description                           |
| -------- | ------------------------------------------------ | ------------------------------------- |
| `GET`    | `/api2/default-repo/`                            | Get default library                   |
| `POST`   | `/api2/default-repo/`                            | Create default library                |
| `GET`    | `/api2/repos/`                                   | List libraries/Search library by name |
| `POST`   | `/api2/repos/`                                   | Create (Encrypted) library            |
| `GET`    | `/api2/repos/{repo_id}/`                         | Get library info                      |
| `POST`   | `/api2/repos/{repo_id}/`                         | Rename/Decrypt library                |
| `DELETE` | `/api2/repos/{repo_id}/`                         | Delete library                        |
| `GET`    | `/api2/repos/{repo_id}/owner/`                   | Get library owner                     |
| `PUT`    | `/api2/repos/{repo_id}/owner/`                   | Transfer library                      |
| `GET`    | `/api/v2.1/repos/{repo_id}/history/`             | Get library history                   |
| `GET`    | `/api2/repos/{repo_id}/history-limit/`           | Get library history limit days        |
| `PUT`    | `/api2/repos/{repo_id}/history-limit/`           | Set library history limit days        |
| `GET`    | `/api/v2.1/repos/{repo_id}/trash/`               | Get library trash                     |
| `DELETE` | `/api/v2.1/repos/{repo_id}/trash/`               | Clean library trash                   |
| `GET`    | `/api/v2.1/repos/{repo_id}/commits/{commit_id}/` | Get library commit info               |

### List Share

| Method | Endpoint                                  | Description                           |
| ------ | ----------------------------------------- | ------------------------------------- |
| `GET`  | `/api2/repos/{repo_id}/dir/shared_items/` | List shared users/groups of a library |
| `GET`  | `/api2/beshared-repos/`                   | List libraries shared to me           |

### Share to User/Group

| Method   | Endpoint                                           | Description                                     |
| -------- | -------------------------------------------------- | ----------------------------------------------- |
| `PUT`    | `/api2/repos/{repo_id}/dir/shared_items/`          | Share a library to user/group                   |
| `DELETE` | `/api2/repos/{repo_id}/dir/shared_items/`          | Unshare a library from user/group               |
| `POST`   | `/api2/repos/{repo_id}/dir/shared_items/`          | Update user share permission of a library       |
| `DELETE` | `/api2/beshared-repos/{repo_id}/`                  | Delete a library shared to me (leave the share) |
| `POST`   | `/api/v2.1/repos/batch/`                           | Batch share libraries to user/group             |
| `PUT`    | `/api2/repos/{repo_id}/dir/shared_items/?p={path}` | Share a folder                                  |
| `GET`    | `/api/v2.1/shared-folders/`                        | List shared folders                             |
| `POST`   | `/api2/repos/{repo_id}/dir/shared_items/?p={path}` | Update folder share permission                  |
| `DELETE` | `/api2/repos/{repo_id}/dir/shared_items/?p={path}` | Remove the specified shared folder              |

### Server Info

| Method | Endpoint             | Description            |
| ------ | -------------------- | ---------------------- |
| `GET`  | `/api2/server-info/` | Get server information |

### Share Links (User)

| Method   | Endpoint                                               | Description                        |
| -------- | ------------------------------------------------------ | ---------------------------------- |
| `GET`    | `/api/v2.1/share-links/`                               | List all share links               |
| `POST`   | `/api/v2.1/share-links/`                               | Create share link                  |
| `POST`   | `/api/v2.1/multi-share-links/`                         | Create multi share links           |
| `POST`   | `/api/v2.1/multi-share-links/batch/`                   | Batch create shared links          |
| `GET`    | `/api/v2.1/share-links/?repo_id={repo_id}/`            | List share links of a library      |
| `GET`    | `/api/v2.1/share-links/?repo_id={repo_id}&path={path}` | List share link of a folder (file) |
| `DELETE` | `/api/v2.1/share-links/{token}/`                       | Delete share link                  |
| `POST`   | `/api2/send-share-link/`                               | Send share link email              |
| `GET`    | `/api2/d/{token}/dir/`                                 | List items in folder download link |
| `GET`    | `/api/v2.1/share-links/{token}/dirents/`               | List direntry in dir download link |
| `GET`    | `/api/v2.1/share-links/{link_token}/user-auth/`        | List user authorizations           |
| `POST`   | `/api/v2.1/share-links/{link_token}/user-auth/`        | Add user authorization             |
| `DELETE` | `/api/v2.1/share-links/{link_token}/user-auth/`        | Delete user authorization          |
| `GET`    | `/api/v2.1/share-links/{link_token}/email-auth/`       | List email authorizations          |
| `POST`   | `/api/v2.1/share-links/{link_token}/email-auth/`       | Add email authorization            |
| `DELETE` | `/api/v2.1/share-links/{link_token}/email-auth/`       | Delete email authorization         |

### Snapshot

| Method | Endpoint                                                | Description                           |
| ------ | ------------------------------------------------------- | ------------------------------------- |
| `GET`  | `/api/v2.1/repos/{repo_id}/commits/{commit_id}/dir/`    | List items in directory of a snapshot |
| `POST` | `/api/v2.1/repos/{repo_id}/commits/{commit_id}/revert/` | Revert library to a snapshot          |

### Snapshot Label

| Method   | Endpoint                                | Description           |
| -------- | --------------------------------------- | --------------------- |
| `GET`    | `/api/v2.1/revision-tags/tag-names/`    | Get snapshot label    |
| `POST`   | `/api/v2.1/revision-tags/tagged-items/` | Create snapshot label |
| `PUT`    | `/api/v2.1/revision-tags/tagged-items/` | Update snapshot label |
| `DELETE` | `/api/v2.1/revision-tags/tagged-items/` | Delete snapshot label |

### Starred Items

| Method   | Endpoint                   | Description                  |
| -------- | -------------------------- | ---------------------------- |
| `GET`    | `/api/v2.1/starred-items/` | List starred items           |
| `POST`   | `/api/v2.1/starred-items/` | Star a library/folder/file   |
| `DELETE` | `/api/v2.1/starred-items/` | Unstar a library/folder/file |

### Sub Folder Permissions

| Method   | Endpoint                                   | Description                    |
| -------- | ------------------------------------------ | ------------------------------ |
| `GET`    | `/api2/repos/{repo_id}/user-folder-perm/`  | Get user folder permission     |
| `POST`   | `/api2/repos/{repo_id}/user-folder-perm/`  | Set user folder permission     |
| `PUT`    | `/api2/repos/{repo_id}/user-folder-perm/`  | Modify user folder permission  |
| `DELETE` | `/api2/repos/{repo_id}/user-folder-perm/`  | Delete user folder permission  |
| `GET`    | `/api2/repos/{repo_id}/group-folder-perm/` | Get group folder permission    |
| `POST`   | `/api2/repos/{repo_id}/group-folder-perm/` | Set group folder permission    |
| `PUT`    | `/api2/repos/{repo_id}/group-folder-perm/` | Modify group folder permission |
| `DELETE` | `/api2/repos/{repo_id}/group-folder-perm/` | Delete group folder permission |

### Upload Links

| Method   | Endpoint                                 | Description            |
| -------- | ---------------------------------------- | ---------------------- |
| `GET`    | `/api/v2.1/upload-links/`                | List upload links      |
| `POST`   | `/api/v2.1/upload-links/`                | Create upload link     |
| `DELETE` | `/api/v2.1/upload-links/{token}/`        | Delete upload links    |
| `POST`   | `/api2/send-upload-link/`                | Send upload link email |
| `GET`    | `/api/v2.1/upload-links/{token}/upload/` | Get shared upload link |

### User Profile

| Method | Endpoint          | Description         |
| ------ | ----------------- | ------------------- |
| `GET`  | `/api/v2.1/user/` | Get user profile    |
| `PUT`  | `/api/v2.1/user/` | Update user profile |

### User Search

| Method | Endpoint             | Description |
| ------ | -------------------- | ----------- |
| `GET`  | `/api2/search-user/` | Search user |

### Wiki

| Method   | Endpoint                                            | Description                |
| -------- | --------------------------------------------------- | -------------------------- |
| `GET`    | `/api/v2.1/wikis2/`                                 | List wikis                 |
| `POST`   | `/api/v2.1/wikis2/`                                 | Add wiki                   |
| `DELETE` | `/api/v2.1/wiki2/{wiki_id}/`                        | Delete wiki                |
| `PUT`    | `/api/v2.1/wiki2/{wiki_id}/`                        | Update wiki                |
| `GET`    | `/api/v2.1/wiki2/{wiki_id}/config/`                 | Get wiki config            |
| `PUT`    | `/api/v2.1/wiki2/{wiki_id}/config/`                 | Update wiki config         |
| `POST`   | `/api/v2.1/wiki2/{wiki_id}/pages/`                  | Create wiki page           |
| `DELETE` | `/api/v2.1/wiki2/{wiki_id}/page/{page_id}/`         | Delete wiki page           |
| `GET`    | `/api/v2.1/wiki2/{wiki_id}/page/{page_id}/`         | Get wiki page              |
| `POST`   | `/api/v2.1/wiki2/8/duplicate-page/`                 | Duplicate wiki page        |
| `GET`    | `/api/v2.1/wiki2/{wiki_id}/publish/`                | Get publish wiki link      |
| `POST`   | `/api/v2.1/wiki2/{wiki_id}/publish/`                | Publish wiki               |
| `DELETE` | `/api/v2.1/wiki2/{wiki_id}/publish/`                | Delete published wiki link |
| `GET`    | `/api/v2.1/wiki2/{wiki_id}/publish-config/`         | Get publish wiki config    |
| `GET`    | `/api/v2.1/wiki2/{wiki_id}/publish/page/{page_id}/` | Get publish wiki page      |
| `POST`   | `/api/v2.1/wiki2/search/`                           | Search wiki                |
| `POST`   | `/api/v2.1/convert-wiki/`                           | Convert wiki               |
| `GET`    | `/api/v2.1/wiki2/{wiki_id}/trash/`                  | Get wiki page trash        |
| `PUT`    | `/api/v2.1/wiki2/{wiki_id}/trash/`                  | Revert page                |
| `DELETE` | `/api/v2.1/wiki2/{wiki_id}/trash/`                  | Clean wiki page trash      |

---

## Account Operations - System Admin

### Accounts (Admin)

| Method   | Endpoint                           | Description          |
| -------- | ---------------------------------- | -------------------- |
| `GET`    | `/api/v2.1/admin/users/`           | List all users' info |
| `POST`   | `/api/v2.1/admin/users/`           | Add user             |
| `GET`    | `/api/v2.1/admin/search-user/`     | Search user          |
| `GET`    | `/api/v2.1/admin/users/{user_id}/` | Get a user's info    |
| `PUT`    | `/api/v2.1/admin/users/{user_id}/` | Update user info     |
| `DELETE` | `/api/v2.1/admin/users/{user_id}/` | Delete user          |

### Departments (Admin)

| Method   | Endpoint                                          | Description                             |
| -------- | ------------------------------------------------- | --------------------------------------- |
| `GET`    | `/api/v2.1/admin/address-book/groups/`            | List top level departments              |
| `POST`   | `/api/v2.1/admin/address-book/groups/`            | Add a department                        |
| `GET`    | `/api/v2.1/admin/address-book/groups/{group_id}/` | List groups and members in a department |
| `DELETE` | `/api/v2.1/admin/address-book/groups/{group_id}/` | Delete a department                     |

### Department Libraries (Admin)

| Method   | Endpoint                                                             | Description                |
| -------- | -------------------------------------------------------------------- | -------------------------- |
| `POST`   | `/api/v2.1/admin/groups/{group_id}/group-owned-libraries/`           | Add group owned library    |
| `DELETE` | `/api/v2.1/admin/groups/{group_id}/group-owned-libraries/{repo_id}/` | Delete group owned library |

### Groups (Admin)

| Method   | Endpoint                                                 | Description                           |
| -------- | -------------------------------------------------------- | ------------------------------------- |
| `GET`    | `/api/v2.1/admin/groups/`                                | Get all groups                        |
| `POST`   | `/api/v2.1/admin/groups/`                                | Create a new group                    |
| `DELETE` | `/api/v2.1/admin/groups/{group_id}/`                     | Delete a group                        |
| `PUT`    | `/api/v2.1/admin/groups/{group_id}/`                     | Transfer a group/Set department quota |
| `GET`    | `/api/v2.1/admin/search-group/`                          | Search group                          |
| `GET`    | `/api/v2.1/admin/groups/{group_id}/members/`             | List group members                    |
| `POST`   | `/api/v2.1/admin/groups/{group_id}/members/`             | Add group member                      |
| `DELETE` | `/api/v2.1/admin/groups/{group_id}/members/{user_id}/`   | Delete group member                   |
| `PUT`    | `/api/v2.1/admin/groups/{group_id}/members/{user_id}/`   | Set(Unset) a group member as admin    |
| `GET`    | `/api/v2.1/admin/groups/{group_id}/libraries/`           | List libraries shared to a group      |
| `DELETE` | `/api/v2.1/admin/groups/{group_id}/libraries/{repo_id}/` | Remove a library from group           |

### Libraries (Admin)

| Method   | Endpoint                                             | Description                                              |
| -------- | ---------------------------------------------------- | -------------------------------------------------------- |
| `GET`    | `/api/v2.1/admin/libraries/`                         | Get all libraries/Search library by owner                |
| `POST`   | `/api/v2.1/admin/libraries/`                         | Create library                                           |
| `GET`    | `/api/v2.1/admin/search-library/`                    | Search library by name                                   |
| `GET`    | `/api/v2.1/admin/libraries/{repo_id}/`               | Get a library info                                       |
| `DELETE` | `/api/v2.1/admin/libraries/{repo_id}/`               | Delete a library                                         |
| `PUT`    | `/api/v2.1/admin/libraries/{repo_id}/`               | Update a library status/Transfer a library               |
| `GET`    | `/api/v2.1/admin/trash-libraries/`                   | Get all deleted libraries/Get deleted libraries by owner |
| `DELETE` | `/api/v2.1/admin/trash-libraries/`                   | Clean all deleted libraries                              |
| `DELETE` | `/api/v2.1/admin/trash-libraries/{repo_id}/`         | Clean deleted library                                    |
| `PUT`    | `/api/v2.1/admin/trash-libraries/{repo_id}/`         | Restore deleted library                                  |
| `GET`    | `/api/v2.1/admin/libraries/{repo_id}/history-limit/` | Get library history setting                              |
| `PUT`    | `/api/v2.1/admin/libraries/{repo_id}/history-limit/` | Update library history setting                           |
| `POST`   | `/api/v2.1/admin/libraries/{repo_id}/dirents/`       | Create library folder                                    |

### Logs (Admin)

| Method | Endpoint                            | Description               |
| ------ | ----------------------------------- | ------------------------- |
| `GET`  | `/api/v2.1/admin/logs/login/`       | Get login log             |
| `GET`  | `/api/v2.1/admin/logs/file-audit/`  | Get file access log       |
| `GET`  | `/api/v2.1/admin/logs/file-update/` | Get file update logs      |
| `GET`  | `/api/v2.1/admin/logs/perm-audit/`  | Get permission audit logs |

### Notifications (Admin)

| Method | Endpoint                         | Description       |
| ------ | -------------------------------- | ----------------- |
| `GET`  | `/api/v2.1/admin/notifications/` | Get notifications |

### Organizations (Admin)

| Method   | Endpoint                                  | Description              |
| -------- | ----------------------------------------- | ------------------------ |
| `GET`    | `/api/v2.1/admin/organizations/`          | Get organizations        |
| `POST`   | `/api/v2.1/admin/organizations/`          | Add organizations        |
| `GET`    | `/api/v2.1/admin/search-organization/`    | Search organizations     |
| `GET`    | `/api/v2.1/admin/organizations/{org_id}/` | Get organization info    |
| `PUT`    | `/api/v2.1/admin/organizations/{org_id}/` | Update organization info |
| `DELETE` | `/api/v2.1/admin/organizations/{org_id}/` | Delete organization      |

### Share (Admin)

| Method   | Endpoint                  | Description                             |
| -------- | ------------------------- | --------------------------------------- |
| `GET`    | `/api/v2.1/admin/shares/` | Get repo user/group shares              |
| `POST`   | `/api/v2.1/admin/shares/` | Share repo to user/group                |
| `PUT`    | `/api/v2.1/admin/shares/` | Modify repo user/group share permission |
| `DELETE` | `/api/v2.1/admin/shares/` | Delete repo user/group share            |

### Share Links (Admin)

| Method   | Endpoint                                       | Description                       |
| -------- | ---------------------------------------------- | --------------------------------- |
| `GET`    | `/api/v2.1/admin/share-links/`                 | Get all share links               |
| `GET`    | `/api/v2.1/admin/share-links/{token}/`         | Get shared file/dir info          |
| `DELETE` | `/api/v2.1/admin/share-links/{token}/`         | Delete share link                 |
| `GET`    | `/api/v2.1/admin/share-links/{token}/dirents/` | List items in folder shared links |

---

## Metadata Operations - User

### Metadata Config

| Method   | Endpoint                                                   | Description                 |
| -------- | ---------------------------------------------------------- | --------------------------- |
| `GET`    | `/api/v2.1/repos/{repo_id}/metadata/`                      | Get metadata enabled status |
| `PUT`    | `/api/v2.1/repos/{repo_id}/metadata/`                      | Enable metadata             |
| `DELETE` | `/api/v2.1/repos/{repo_id}/metadata/`                      | Disable metadata            |
| `PUT`    | `/api/v2.1/repos/{repo_id}/metadata/details-settings/`     | Details settings            |
| `POST`   | `/api/v2.1/repos/{repo_id}/metadata/extract-file-details/` | Extract file details        |

### Metadata Records

| Method | Endpoint                                      | Description             |
| ------ | --------------------------------------------- | ----------------------- |
| `GET`  | `/api/v2.1/repos/{repo_id}/metadata-records/` | List metadata records   |
| `PUT`  | `/api/v2.1/repos/{repo_id}/metadata-records/` | Update metadata records |
| `GET`  | `/api/v2.1/repos/{repo_id}/metadata-record/`  | Get metadata record     |
| `PUT`  | `/api/v2.1/repos/{repo_id}/metadata-record/`  | Update metadata record  |
| `POST` | `/api/v2.1/repos/{repo_id}/metadata-columns/` | Add column              |

### Metadata Views

| Method   | Endpoint                                              | Description    |
| -------- | ----------------------------------------------------- | -------------- |
| `GET`    | `/api/v2.1/repos/{repo_id}/metadata-views/`           | List views     |
| `POST`   | `/api/v2.1/repos/{repo_id}/metadata-views/`           | Add view       |
| `PUT`    | `/api/v2.1/repos/{repo_id}/metadata-views/`           | Update view    |
| `DELETE` | `/api/v2.1/repos/{repo_id}/metadata-views/`           | Delete view    |
| `GET`    | `/api/v2.1/repos/{repo_id}/metadata-views/{view_id}/` | Get a view     |
| `POST`   | `/api/v2.1/repos/{repo_id}/metadata/move-views/`      | Move view      |
| `POST`   | `/api/v2.1/repos/{repo_id}/metadata/duplicate-view/`  | Duplicate view |

### Tags (Metadata)

| Method   | Endpoint                                                 | Description           |
| -------- | -------------------------------------------------------- | --------------------- |
| `PUT`    | `/api/v2.1/repos/{repo_id}/metadata/tags-status/`        | Turn on tags feature  |
| `DELETE` | `/api/v2.1/repos/{repo_id}/metadata/tags-status/`        | Turn off tags feature |
| `GET`    | `/api/v2.1/repos/{repo_id}/metadata/tags/`               | List tags             |
| `POST`   | `/api/v2.1/repos/{repo_id}/metadata/tags/`               | Add tags              |
| `PUT`    | `/api/v2.1/repos/{repo_id}/metadata/tags/`               | Update tags           |
| `DELETE` | `/api/v2.1/repos/{repo_id}/metadata/tags/`               | Delete tags           |
| `PUT`    | `/api/v2.1/repos/{repo_id}/metadata/file-tags/`          | Update file tags      |
| `GET`    | `/api/v2.1/repos/{repo_id}/metadata/tag-files/{tag_id}/` | List tag files        |
| `POST`   | `/api/v2.1/repos/{repo_id}/metadata/tags-files/`         | List tags files       |
| `POST`   | `/api/v2.1/repos/{repo_id}/metadata/tags-links/`         | Add tags links        |
| `PUT`    | `/api/v2.1/repos/{repo_id}/metadata/tags-links/`         | Update tags links     |
| `DELETE` | `/api/v2.1/repos/{repo_id}/metadata/tags-links/`         | Delete tags links     |
| `POST`   | `/api/v2.1/repos/{repo_id}/metadata/merge-tags/`         | Merge tags            |

### OCR

| Method   | Endpoint                                  | Description          |
| -------- | ----------------------------------------- | -------------------- |
| `PUT`    | `/api/v2.1/repos/{repo_id}/metadata/ocr/` | Turn on OCR feature  |
| `DELETE` | `/api/v2.1/repos/{repo_id}/metadata/ocr/` | Turn off OCR feature |

### Face Recognition

| Method   | Endpoint                                                             | Description                         |
| -------- | -------------------------------------------------------------------- | ----------------------------------- |
| `GET`    | `/api/v2.1/repos/{repo_id}/metadata/face-recognition/`               | Get face recognition enabled status |
| `POST`   | `/api/v2.1/repos/{repo_id}/metadata/face-recognition/`               | Open face recognition               |
| `GET`    | `/api/v2.1/repos/{repo_id}/metadata/face-records/`                   | List face records                   |
| `GET`    | `/api/v2.1/repos/{repo_id}/metadata/people-photos/{people_id}/`      | List people photos                  |
| `DELETE` | `/api/v2.1/repos/{repo_id}/metadata/people-photos/{people_id}/`      | Remove people photos                |
| `POST`   | `/api/v2.1/repos/{repo_id}/metadata/people-photos/{people_id}/`      | Add people photos                   |
| `PUT`    | `/api/v2.1/repos/{repo_id}/metadata/face-record/`                    | Update face name                    |
| `PUT`    | `/api/v2.1/repos/{repo_id}/metadata/people-cover-photo/{people_id}/` | Update people cover photo           |

---

## Quick Reference: Common Operations

### Authentication Flow

```bash
# 1. Obtain Account Token
curl -X POST https://{server}/api2/auth-token/ \
  -d "username=user@example.com" \
  -d "password=yourpassword"

# 2. Generate Repo Token (optional, for library-specific access)
curl -X POST https://{server}/api/v2.1/repos/{repo_id}/repo-api-tokens/ \
  -H "Authorization: Bearer {account_token}" \
  -d "permission=rw" \
  -d "app_name=myapp"
```

### Library Operations

```bash
# List all libraries
curl -X GET https://{server}/api2/repos/ \
  -H "Authorization: Bearer {token}"

# Create a new library
curl -X POST https://{server}/api2/repos/ \
  -H "Authorization: Bearer {token}" \
  -d "name=My Library"

# Get library info
curl -X GET https://{server}/api2/repos/{repo_id}/ \
  -H "Authorization: Bearer {token}"

# Delete a library
curl -X DELETE https://{server}/api2/repos/{repo_id}/ \
  -H "Authorization: Bearer {token}"
```

### File Operations

```bash
# List directory contents
curl -X GET https://{server}/api2/repos/{repo_id}/dir/?p=/ \
  -H "Authorization: Bearer {token}"

# Get upload link
curl -X GET https://{server}/api2/repos/{repo_id}/upload-link/ \
  -H "Authorization: Bearer {token}"

# Upload a file
curl -X POST {upload_link} \
  -H "Authorization: Bearer {token}" \
  -F "file=@/path/to/file.txt" \
  -F "parent_dir=/" \
  -F "replace=1"

# Download a file
curl -X GET https://{server}/api2/repos/{repo_id}/file/?p=/file.txt \
  -H "Authorization: Bearer {token}"

# Delete a file
curl -X DELETE https://{server}/api/v2.1/repos/{repo_id}/file/ \
  -H "Authorization: Bearer {token}" \
  -d "p=/file.txt"
```

### Share Operations

```bash
# Create a share link
curl -X POST https://{server}/api/v2.1/share-links/ \
  -H "Authorization: Bearer {token}" \
  -d "repo_id={repo_id}" \
  -d "path=/"

# Share library to user
curl -X PUT https://{server}/api2/repos/{repo_id}/dir/shared_items/ \
  -H "Authorization: Bearer {token}" \
  -d "share_type=user" \
  -d "username=other@example.com" \
  -d "permission=rw"
```

---

_Document generated from the Seafile API v13.0 reference documentation._
